import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiService } from "../../ai/services/ai.service";
import { CreditPricingService } from "../../credits/services/credit-pricing.service";
import { PropertyMatch } from "../../property-hunts/entities/property-match.entity";
import { ListingPageReaderService } from "../../property-hunts/services/listing-page-reader.service";
import { PropertyContact } from "../../properties/entities/property-contact.entity";
import { Property } from "../../properties/entities/property.entity";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { User } from "../../users/entities/user.entity";
import {
  OWNER_CONTACT_SOURCES,
  OWNER_REGISTRY_SOURCES,
  OWNER_SEARCH_PHRASES,
  OwnerContactSource,
  OwnerRegistrySource,
} from "../constants/owner-sources.constant";
import {
  MATCH_CONFIDENCES,
  MatchConfidence,
  OwnerContactSaveDto,
  OwnerContactSearchDto,
} from "../dtos/owner-finder.dto";
import {
  advertiserSignalOf,
  phoneFromContacts,
} from "../helpers/advertiser-signals.helper";

/** Most owner contacts the AI brings back for one property. */
const MAXIMUM_CONTACTS = 5;

/** Ads the AI may suggest, before they are checked on the page. */
const MAXIMUM_CANDIDATES = 10;

/** Listings this property came from, read to know which broker to skip. */
const MAXIMUM_ORIGIN_LISTINGS = 3;

/** Listing pages opened to confirm who posted them and to get the phone. */
const MAXIMUM_PAGES_CHECKED = 8;
const PAGE_CHECK_TIMEOUT_MILLISECONDS = 50_000;

const kindWords: Record<PropertyKindEnum, string> = {
  [PropertyKindEnum.HOUSE]: "casa",
  [PropertyKindEnum.APARTMENT]: "apartamento",
  [PropertyKindEnum.COMMERCIAL]: "imóvel comercial",
  [PropertyKindEnum.LAND]: "terreno",
};

const confidenceOrder: Record<MatchConfidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** What is known about the property whose owner is searched. */
interface OwnerTarget {
  propertyId: string | null;
  kind: PropertyKindEnum | null;
  address: string;
  complement: string | null;
  buildingName: string | null;
  bedrooms: number | null;
  squareMeters: number | null;
  floor: number | null;
  price: number | null;
  details: string | null;
  /** Ads of this property already known, usually posted by a broker. */
  originListings: { url: string | null; advertiser: string | null }[];
  /** Digits of the contacts already saved on the property. */
  savedPhones: string[];
}

export interface OwnerContact {
  name: string | null;
  /** Only digits, with the area code. */
  phone: string;
  sourceName: string;
  sourceUrl: string;
  sourceTitle: string;
  /** How sure the AI is that the ad is of this same property. */
  matchConfidence: MatchConfidence;
  /** Why the contact is believed to be the owner's. */
  evidence: string;
  /** True when the listing page was opened and confirmed the owner. */
  verified: boolean;
  /** True when this phone is already saved on the property. */
  alreadySaved: boolean;
}

interface AiContact {
  name: string | null;
  phone: string | null;
  sourceUrl: string;
  sourceTitle: string;
  matchConfidence: MatchConfidence;
  evidence: string;
}

const CONTACTS_SCHEMA = {
  name: "owner_contacts",
  schema: {
    type: "object",
    properties: {
      contacts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: ["string", "null"] },
            phone: { type: ["string", "null"] },
            sourceUrl: { type: "string" },
            sourceTitle: { type: "string" },
            matchConfidence: { type: "string", enum: MATCH_CONFIDENCES },
            evidence: { type: "string" },
          },
          required: [
            "name",
            "phone",
            "sourceUrl",
            "sourceTitle",
            "matchConfidence",
            "evidence",
          ],
          additionalProperties: false,
        },
      },
      ignoredIntermediaries: { type: "integer" },
    },
    required: ["contacts", "ignoredIntermediaries"],
    additionalProperties: false,
  },
};

const INSTRUCTIONS = `Você ajuda um corretor de imóveis brasileiro a falar direto com o proprietário de UM imóvel específico, cortando o intermediário (corretor ou imobiliária que esteja anunciando esse imóvel).
Pesquise na internet, somente nos sites permitidos, anúncios deste mesmo imóvel publicados pelo próprio dono, e traga apenas o contato do dono.
Não procure outros imóveis e não traga anúncios de imóveis parecidos.
Confira se o anúncio é do mesmo imóvel pelo endereço, nome do prédio, andar, metragem, quartos e preço. matchConfidence: "high" quando endereço ou prédio e as características batem; "medium" quando bairro e características batem mas o endereço não aparece; "low" quando só parece.
Só conta como dono: selo "Particular" na OLX, vendedor pessoa física, portal só de proprietários, textos como "direto com o proprietário", "direto com o dono", "sem corretor", "não aceito corretor".
Ignore anúncios de corretor, imobiliária, com CRECI ou dos anunciantes informados como intermediários; some quantos ignorou em ignoredIntermediaries.
O telefone só entra se estiver escrito no anúncio, com DDD; quando estiver escondido atrás de "ver telefone", use null, o anúncio será aberto para conferir. Nunca invente nome ou telefone; nome desconhecido fica null.
sourceUrl é o link direto do anúncio. evidence explica em uma frase curta, em português, por que o contato é do dono e do mesmo imóvel.
Traga no máximo ${MAXIMUM_CANDIDATES} anúncios, os mais seguros primeiro. Se não achar, devolva a lista vazia.`;

@Injectable()
export class OwnerFinderService {
  constructor(
    private readonly aiService: AiService,
    private readonly pricingService: CreditPricingService,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(PropertyContact)
    private readonly propertyContactRepository: Repository<PropertyContact>,
    @InjectRepository(PropertyMatch)
    private readonly propertyMatchRepository: Repository<PropertyMatch>,
    private readonly pageReader: ListingPageReaderService,
  ) {}

  /** Free links to look for the owner's ad and the official registries. */
  async links(user: User, dto: OwnerContactSearchDto) {
    const target = await this.target(user, dto);

    return {
      price: this.pricingService.featurePrice("owner_search"),
      sources: OWNER_CONTACT_SOURCES.map((source) => ({
        key: source.key,
        name: source.name,
        kind: source.kind,
        hint: source.hint,
        url: this.googleSearchUrl(source, target),
      })),
      registries: OWNER_REGISTRY_SOURCES.filter((source) =>
        this.coversAddress(source, target.address),
      ).map((source) => ({
        key: source.key,
        name: source.name,
        hint: source.hint,
        url: source.url,
      })),
    };
  }

  /** The AI looks for ads of this property posted by its owner. */
  async searchContacts(user: User, dto: OwnerContactSearchDto) {
    const target = await this.target(user, dto);
    const allowedDomains = OWNER_CONTACT_SOURCES.map((source) => source.domain);

    const result = await this.aiService.generate(user.id, {
      feature: "owner_search",
      instructions: INSTRUCTIONS,
      input: [
        this.describe(target),
        `Sites permitidos: ${allowedDomains.join(", ")}.`,
      ].join("\n"),
      jsonSchema: CONTACTS_SCHEMA,
      webSearch: { allowedDomains, country: "BR" },
      referenceId: target.propertyId,
    });

    const citedUrls = new Set(
      result.citations.map((citation) => this.comparableUrl(citation.url)),
    );
    const parsed = this.parse(result.text);
    let ignoredIntermediaries = Math.max(0, parsed.ignoredIntermediaries);

    const seenUrls = new Set<string>();
    const candidates: { contact: AiContact; source: OwnerContactSource }[] = [];
    for (const contact of parsed.contacts) {
      const source = this.sourceOf(contact.sourceUrl);
      const comparable = this.comparableUrl(contact.sourceUrl);
      if (!source || seenUrls.has(comparable)) continue;
      seenUrls.add(comparable);
      candidates.push({ contact, source });
    }

    // Opens each ad to confirm who posted it and press "ver telefone".
    const pages = await this.pageReader.readPages(
      candidates.map(({ contact }) => contact.sourceUrl),
      {
        limit: MAXIMUM_PAGES_CHECKED,
        timeoutMilliseconds: PAGE_CHECK_TIMEOUT_MILLISECONDS,
      },
    );

    const contacts = new Map<string, OwnerContact>();
    for (const { contact, source } of candidates) {
      const page = pages.get(contact.sourceUrl);
      let phone = this.normalizePhone(contact.phone);
      let evidence = contact.evidence.trim();
      let verified = false;

      if (page) {
        const signal = advertiserSignalOf(
          page.text,
          source.kind === "owner_portal",
        );
        if (signal.type === "agency") {
          ignoredIntermediaries += 1;
          continue;
        }
        if (signal.type === "owner") {
          verified = true;
          evidence = `Conferido no anúncio: ${signal.reason ?? evidence}`;
        }
        phone ??= phoneFromContacts(page.contacts, signal.type === "owner");
      }
      if (!phone) continue;

      const found: OwnerContact = {
        name: contact.name?.trim() || null,
        phone,
        sourceName: source.name,
        sourceUrl: contact.sourceUrl,
        sourceTitle: contact.sourceTitle.trim().slice(0, 200) || source.name,
        matchConfidence: contact.matchConfidence,
        evidence,
        verified:
          verified ||
          (!page && citedUrls.has(this.comparableUrl(contact.sourceUrl))),
        alreadySaved: target.savedPhones.includes(phone),
      };

      const known = contacts.get(phone);
      if (
        !known ||
        confidenceOrder[found.matchConfidence] <
          confidenceOrder[known.matchConfidence]
      ) {
        contacts.set(phone, found);
      }
    }

    return {
      contacts: [...contacts.values()]
        .sort(
          (first, second) =>
            confidenceOrder[first.matchConfidence] -
              confidenceOrder[second.matchConfidence] ||
            Number(second.verified) - Number(first.verified),
        )
        .slice(0, MAXIMUM_CONTACTS),
      ignoredIntermediaries,
      creditsCharged: result.creditsCharged,
      balance: result.balance,
    };
  }

  /** Saves a contact found as an owner of the property. */
  async saveContact(user: User, dto: OwnerContactSaveDto) {
    const property = await this.findProperty(user, dto.propertyId);
    const phone = this.normalizePhone(dto.phone);
    if (!phone) throw new BadRequestException("Telefone inválido.");

    const alreadySaved = (property.contacts ?? []).some(
      (contact) => this.normalizePhone(contact.phone) === phone,
    );

    if (!alreadySaved) {
      await this.propertyContactRepository.save(
        this.propertyContactRepository.create({
          user,
          property,
          name: dto.name?.trim() || null,
          phone,
        }),
      );

      const note = `Proprietário encontrado em ${dto.sourceName}: ${dto.sourceUrl}`;
      await this.propertyRepository.update(
        { id: property.id },
        { comment: [property.comment, note].filter(Boolean).join("\n\n") },
      );
    }

    return { propertyId: property.id, alreadySaved };
  }

  private async target(
    user: User,
    dto: OwnerContactSearchDto,
  ): Promise<OwnerTarget> {
    if (dto.propertyId) {
      const property = await this.findProperty(user, dto.propertyId);
      const matches = await this.propertyMatchRepository.find({
        where: { propertyId: property.id, userId: user.id },
        order: { createdAt: "DESC" },
        take: MAXIMUM_ORIGIN_LISTINGS,
      });

      return {
        propertyId: property.id,
        kind: property.kind,
        address: property.address,
        complement: property.address2?.trim() || null,
        buildingName: property.alias?.trim() || null,
        bedrooms: property.infoBedrooms,
        squareMeters: property.infoSquareMeters
          ? Number(property.infoSquareMeters)
          : null,
        floor: property.infoFloor,
        price: Number(property.price) || null,
        details: dto.details?.trim() || null,
        originListings: matches.map((match) => ({
          url: match.externalUrl,
          advertiser: this.describeAdvertiser(match),
        })),
        savedPhones: (property.contacts ?? [])
          .map((contact) => this.normalizePhone(contact.phone))
          .filter((phone): phone is string => Boolean(phone)),
      };
    }

    if (!dto.address?.trim()) {
      throw new BadRequestException(
        "Informe o imóvel cadastrado ou o endereço do imóvel.",
      );
    }

    return {
      propertyId: null,
      kind: dto.kind ?? null,
      address: dto.address.trim(),
      complement: dto.complement?.trim() || null,
      buildingName: null,
      bedrooms: dto.bedrooms ?? null,
      squareMeters: dto.squareMeters ?? null,
      floor: null,
      price: null,
      details: dto.details?.trim() || null,
      originListings: [],
      savedPhones: [],
    };
  }

  /** City only registries show up for addresses of that city. */
  private coversAddress(source: OwnerRegistrySource, address: string) {
    if (!source.onlyFor) return true;
    const postalCode = /\b(\d{5})-?\d{3}\b/.exec(address);
    if (postalCode && source.postalCodeRanges) {
      const prefix = Number(postalCode[1]);
      return source.postalCodeRanges.some(
        ([first, last]) => prefix >= first && prefix <= last,
      );
    }
    const location = address.toLowerCase();
    return source.onlyFor.some((word) => location.includes(word));
  }

  private async findProperty(user: User, propertyId: string) {
    return this.propertyRepository
      .findOneOrFail({
        where: { id: propertyId, user: { id: user.id }, active: true },
        relations: { contacts: true },
      })
      .catch(() => {
        throw new NotFoundException("Imóvel não encontrado.");
      });
  }

  private describeAdvertiser(match: PropertyMatch) {
    const advertiser = match.listing?.advertiser;
    if (!advertiser || advertiser.kind === "owner") return null;
    const parts = [
      advertiser.name,
      advertiser.company,
      advertiser.creci ? `CRECI ${advertiser.creci}` : null,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }

  private describe(target: OwnerTarget) {
    const lines = [
      `Imóvel: ${target.kind ? kindWords[target.kind] : "imóvel"}.`,
      `Endereço: ${target.address}.`,
      target.complement ? `Complemento: ${target.complement}.` : null,
      target.buildingName ? `Apelido ou prédio: ${target.buildingName}.` : null,
      target.bedrooms ? `Quartos: ${target.bedrooms}.` : null,
      target.squareMeters ? `Área: ${target.squareMeters} m².` : null,
      target.floor ? `Andar: ${target.floor}.` : null,
      target.price
        ? `Preço de referência: R$ ${target.price.toLocaleString("pt-BR")}.`
        : null,
      target.details ? `Detalhes: ${target.details}` : null,
      ...target.originListings.map((listing) =>
        [
          "Anúncio já conhecido deste imóvel",
          listing.advertiser
            ? `, intermediário a ignorar: ${listing.advertiser}`
            : "",
          listing.url ? ` (${listing.url})` : "",
          ".",
        ].join(""),
      ),
    ];
    return lines.filter(Boolean).join("\n");
  }

  /** Searches the owner's ad of this address, never other properties. */
  private googleSearchUrl(source: OwnerContactSource, target: OwnerTarget) {
    const place = target.address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(" ");
    const ownerPhrases = OWNER_SEARCH_PHRASES.map((phrase) => `"${phrase}"`);
    const words = [
      `site:${source.domain}`,
      target.kind ? kindWords[target.kind] : null,
      target.buildingName,
      place,
      source.kind === "owner_portal" ? null : `(${ownerPhrases.join(" OR ")})`,
    ];
    const query = words.filter(Boolean).join(" ");
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  private parse(text: string): {
    contacts: AiContact[];
    ignoredIntermediaries: number;
  } {
    try {
      const parsed = JSON.parse(text) as {
        contacts?: AiContact[];
        ignoredIntermediaries?: number;
      };
      return {
        contacts: Array.isArray(parsed.contacts)
          ? parsed.contacts.slice(0, MAXIMUM_CANDIDATES)
          : [],
        ignoredIntermediaries: Number(parsed.ignoredIntermediaries) || 0,
      };
    } catch {
      return { contacts: [], ignoredIntermediaries: 0 };
    }
  }

  /** Contacts outside the allowed sites are dropped, the AI may invent them. */
  private sourceOf(url: string) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return null;
      }
      const host = parsed.hostname.toLowerCase();
      return (
        OWNER_CONTACT_SOURCES.find(
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
  private normalizePhone(phone: string | null | undefined) {
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
