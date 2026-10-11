import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiService } from "../../ai/services/ai.service";
import { CreditPricingService } from "../../credits/services/credit-pricing.service";
import { Property } from "../../properties/entities/property.entity";
import { PropertyContact } from "../../properties/entities/property-contact.entity";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { PropertyService } from "../../properties/services/property.service";
import { User } from "../../users/entities/user.entity";
import {
  OWNER_LISTING_SOURCES,
  OWNER_REGISTRY_SOURCES,
  OWNER_SEARCH_PHRASES,
  OwnerListingSource,
} from "../constants/owner-sources.constant";
import {
  ADVERTISER_TYPES,
  AdvertiserType,
  OwnerLeadSaveDto,
  OwnerSearchDto,
} from "../dtos/owner-finder.dto";

/** Most listings the AI brings back in one search. */
const MAXIMUM_LEADS = 12;

const kindWords: Record<PropertyKindEnum, string> = {
  [PropertyKindEnum.HOUSE]: "casa",
  [PropertyKindEnum.APARTMENT]: "apartamento",
  [PropertyKindEnum.COMMERCIAL]: "sala comercial",
};

export interface OwnerLead {
  title: string;
  url: string;
  source: string;
  advertiserType: AdvertiserType;
  advertiserName: string | null;
  /** Only digits, with the area code, as written on the listing. */
  phone: string | null;
  /** In whole reais. */
  price: number | null;
  address: string | null;
  kind: PropertyKindEnum | null;
  bedrooms: number | null;
  squareMeters: number | null;
  /** Why the AI believes the advertiser is, or is not, the owner. */
  evidence: string;
  /** True when the page was really read during the search. */
  verified: boolean;
}

interface AiLead {
  title: string;
  url: string;
  advertiserType: AdvertiserType;
  advertiserName: string | null;
  phone: string | null;
  priceInReais: number | null;
  address: string | null;
  kind: PropertyKindEnum | null;
  bedrooms: number | null;
  squareMeters: number | null;
  evidence: string;
}

const nullable = (type: string) => ({ type: [type, "null"] });

const LEADS_SCHEMA = {
  name: "owner_leads",
  schema: {
    type: "object",
    properties: {
      leads: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            url: { type: "string" },
            advertiserType: { type: "string", enum: ADVERTISER_TYPES },
            advertiserName: nullable("string"),
            phone: nullable("string"),
            priceInReais: nullable("number"),
            address: nullable("string"),
            kind: {
              type: ["string", "null"],
              enum: [...Object.values(PropertyKindEnum), null],
            },
            bedrooms: nullable("integer"),
            squareMeters: nullable("number"),
            evidence: { type: "string" },
          },
          required: [
            "title",
            "url",
            "advertiserType",
            "advertiserName",
            "phone",
            "priceInReais",
            "address",
            "kind",
            "bedrooms",
            "squareMeters",
            "evidence",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["leads"],
    additionalProperties: false,
  },
};

const INSTRUCTIONS = `Você ajuda um corretor de imóveis brasileiro a captar imóveis direto com o proprietário, sem imobiliária ou outro corretor no meio.
Pesquise na internet anúncios que combinem com o pedido, somente nos sites permitidos.
Prefira anúncios publicados pelo próprio dono: selo "Particular" na OLX, vendedor pessoa física, textos como "direto com o proprietário", "direto com o dono", "sem corretor", "não aceito corretor", anúncios sem CRECI e sem nome de imobiliária.
Classifique cada anúncio em advertiserType: "owner" quando há sinais claros de ser o dono, "agency" quando é imobiliária, corretor ou tem CRECI, "unknown" quando não dá para saber.
Use apenas dados que aparecem na página do anúncio. Nunca invente telefone, nome, preço ou endereço; quando não aparecer, use null.
O telefone só entra se estiver escrito no anúncio, com DDD.
url deve ser o link direto do anúncio, não de uma lista de resultados.
evidence explica em uma frase curta, em português, o que indica quem é o anunciante.
Traga no máximo ${MAXIMUM_LEADS} anúncios, os de donos primeiro. Se não achar nada, devolva a lista vazia.`;

@Injectable()
export class OwnerFinderService {
  constructor(
    private readonly aiService: AiService,
    private readonly pricingService: CreditPricingService,
    private readonly propertyService: PropertyService,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(PropertyContact)
    private readonly propertyContactRepository: Repository<PropertyContact>,
  ) {}

  /** Free search links: listing sites and the official registries. */
  links(dto: OwnerSearchDto) {
    const description = this.describe(dto);
    const location = dto.location.toLowerCase();

    return {
      price: this.pricingService.featurePrice("owner_search"),
      listings: OWNER_LISTING_SOURCES.map((source) => ({
        key: source.key,
        name: source.name,
        kind: source.kind,
        hint: source.hint,
        url: this.googleSearchUrl(source, description),
      })),
      registries: OWNER_REGISTRY_SOURCES.filter(
        (source) =>
          !source.onlyFor ||
          source.onlyFor.some((word) => location.includes(word)),
      ).map((source) => ({
        key: source.key,
        name: source.name,
        hint: source.hint,
        url: source.url,
      })),
    };
  }

  /** The AI reads the listing sites and brings the ads posted by owners. */
  async search(user: User, dto: OwnerSearchDto) {
    const allowedDomains = OWNER_LISTING_SOURCES.map((source) => source.domain);

    const result = await this.aiService.generate(user.id, {
      feature: "owner_search",
      instructions: INSTRUCTIONS,
      input: [
        `Pedido: ${this.describe(dto)}.`,
        dto.details ? `Detalhes: ${dto.details}` : null,
        `Sites permitidos: ${allowedDomains.join(", ")}.`,
      ]
        .filter(Boolean)
        .join("\n"),
      jsonSchema: LEADS_SCHEMA,
      webSearch: { allowedDomains, country: "BR" },
      referenceId: dto.propertyId ?? null,
    });

    const citedUrls = new Set(
      result.citations.map((citation) => this.comparableUrl(citation.url)),
    );
    const parsed = this.parse(result.text);
    const seen = new Set<string>();
    const leads: OwnerLead[] = [];
    let ignoredAgencyLeads = 0;

    for (const lead of parsed) {
      const source = this.sourceOf(lead.url);
      if (!source) continue;
      const comparable = this.comparableUrl(lead.url);
      if (seen.has(comparable)) continue;
      seen.add(comparable);

      if (lead.advertiserType === "agency") {
        ignoredAgencyLeads += 1;
        continue;
      }

      leads.push({
        title: lead.title.trim().slice(0, 200) || source.name,
        url: lead.url,
        source: source.name,
        advertiserType: lead.advertiserType,
        advertiserName: lead.advertiserName?.trim() || null,
        phone: this.normalizePhone(lead.phone),
        price:
          lead.priceInReais && lead.priceInReais > 0
            ? Math.round(lead.priceInReais)
            : null,
        address: lead.address?.trim() || null,
        kind: lead.kind,
        bedrooms: lead.bedrooms,
        squareMeters: lead.squareMeters,
        evidence: lead.evidence.trim(),
        verified: citedUrls.has(comparable),
      });
    }

    leads.sort(
      (first, second) =>
        Number(second.advertiserType === "owner") -
          Number(first.advertiserType === "owner") ||
        Number(Boolean(second.phone)) - Number(Boolean(first.phone)),
    );

    return {
      leads,
      ignoredAgencyLeads,
      creditsCharged: result.creditsCharged,
      balance: result.balance,
    };
  }

  /**
   * Keeps a listing found: a new property with the owner as contact, or
   * the owner added to the property the broker was searching for.
   */
  async saveLead(user: User, dto: OwnerLeadSaveDto) {
    const note = [
      `Encontrado em ${dto.source}: ${dto.url}`,
      dto.advertiserName ? `Anunciante: ${dto.advertiserName}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (dto.propertyId) {
      const property = await this.propertyRepository
        .findOneOrFail({
          where: { id: dto.propertyId, user: { id: user.id }, active: true },
        })
        .catch(() => {
          throw new NotFoundException("Imóvel não encontrado.");
        });

      property.comment = [property.comment, note].filter(Boolean).join("\n\n");
      await this.propertyRepository.save(property);

      if (dto.phone) {
        await this.propertyContactRepository.save(
          this.propertyContactRepository.create({
            user,
            property,
            name: dto.advertiserName ?? null,
            phone: dto.phone,
          }),
        );
      }
      return { propertyId: property.id };
    }

    const property = await this.propertyService.save(user, {
      kind: dto.kind ?? null,
      alias: dto.title.slice(0, 120),
      address: dto.address || dto.title,
      address2: "A confirmar",
      comment: note,
      price: String(dto.price ?? 0),
      contacts: dto.phone
        ? [{ phone: dto.phone, name: dto.advertiserName ?? null }]
        : [],
      infoBedrooms: dto.bedrooms ?? null,
      infoSquareMeters: dto.squareMeters ?? null,
    });
    return { propertyId: property.id };
  }

  private describe(dto: OwnerSearchDto) {
    const parts = [
      dto.kind ? kindWords[dto.kind] : "imóvel",
      dto.purpose === "rent" ? "para alugar" : "à venda",
      dto.bedrooms ? `${dto.bedrooms} quartos` : null,
      `em ${dto.location.trim()}`,
      dto.maximumPrice
        ? `até R$ ${dto.maximumPrice.toLocaleString("pt-BR")}`
        : null,
    ];
    return parts.filter(Boolean).join(" ");
  }

  private googleSearchUrl(source: OwnerListingSource, description: string) {
    const ownerPhrases = OWNER_SEARCH_PHRASES.map((phrase) => `"${phrase}"`);
    const words =
      source.kind === "owner_portal"
        ? description
        : `${description} (${ownerPhrases.join(" OR ")})`;
    const query = `site:${source.domain} ${words}`;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  private parse(text: string): AiLead[] {
    try {
      const parsed = JSON.parse(text) as { leads?: AiLead[] };
      return Array.isArray(parsed.leads)
        ? parsed.leads.slice(0, MAXIMUM_LEADS * 2)
        : [];
    } catch {
      return [];
    }
  }

  /** Listings outside the allowed sites are dropped, the AI may invent them. */
  private sourceOf(url: string) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return null;
      }
      const host = parsed.hostname.toLowerCase();
      return (
        OWNER_LISTING_SOURCES.find(
          (source) =>
            host === source.domain || host.endsWith(`.${source.domain}`),
        ) ?? null
      );
    } catch {
      return null;
    }
  }

  private comparableUrl(url: string) {
    try {
      const parsed = new URL(url);
      return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
    } catch {
      return url;
    }
  }

  /** Keeps Brazilian numbers with area code, as 10 or 11 digits. */
  private normalizePhone(phone: string | null) {
    if (!phone) return null;
    let digits = phone.replace(/\D/g, "");
    if (digits.length > 11 && digits.startsWith("55")) {
      digits = digits.slice(2);
    }
    if (digits.length === 12 && digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return digits.length === 10 || digits.length === 11 ? digits : null;
  }
}
