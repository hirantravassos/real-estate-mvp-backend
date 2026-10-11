import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { AiService } from "../../ai/services/ai.service";
import { CreditPricingService } from "../../credits/services/credit-pricing.service";
import { DealSigner } from "../../deals/entities/deal-signer.entity";
import { DealSignerRole } from "../../deals/enums/deal.enum";
import { DocumentOwnerType } from "../../documents/entities/document.entity";
import { DocumentService } from "../../documents/services/document.service";
import { PropertyContact } from "../../properties/entities/property-contact.entity";
import { PropertyService } from "../../properties/services/property.service";
import { User } from "../../users/entities/user.entity";
import {
  PublicLookupProfileField,
  publicLookupProfileFieldLabels,
} from "../constants/public-lookups.constant";
import { PropertyLegalProfileSaveDto } from "../dtos/document-lookup.dto";
import {
  PropertyLegalOwner,
  PropertyLegalProfile,
} from "../entities/property-legal-profile.entity";
import {
  locationFromAddress,
  stateAbbreviationOf,
} from "../helpers/address-location.helper";
import { normalizeTaxDocument } from "../helpers/tax-document.helper";

export type OwnerSuggestionSource = "contact" | "deal" | "document";

export interface OwnerSuggestion {
  name: string;
  /** Only digits, null when the source has the name only. */
  documentNumber: string | null;
  source: OwnerSuggestionSource;
}

/** Checklist files the AI reads, in the order they are most useful. */
const READABLE_CATEGORIES = [
  "registration",
  "owner_identity",
  "property_tax_clearance",
  "owner_civil_status",
  "laudemium_clearance",
];
const READABLE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAXIMUM_FILES_READ = 6;
const MAXIMUM_FILE_BYTES = 8 * 1024 * 1024;
const MAXIMUM_TOTAL_BYTES = 24 * 1024 * 1024;
const GEOCODE_TIMEOUT_MILLISECONDS = 5_000;

const PROFILE_TEXT_FIELDS: PublicLookupProfileField[] = [
  "city",
  "state",
  "registrationNumber",
  "registryOffice",
  "propertyTaxNumber",
  "unionPropertyNumber",
];

const READING_INSTRUCTIONS = `Você lê documentos de um imóvel à venda no Brasil: matrícula, carnê ou certidão do IPTU, RG, CNH, CPF, certidões de nascimento ou casamento e certidões da SPU.
Extraia só o que estiver escrito nos documentos, nunca invente nem complete dígitos. Deixe null o que não aparecer.
- registrationNumber: número da matrícula no registro de imóveis.
- registryOffice: nome do cartório de registro de imóveis, como "2º Registro de Imóveis de Santos".
- city e state: município e UF do imóvel (state com duas letras).
- propertyTaxNumber: inscrição imobiliária, cadastro ou número do contribuinte do IPTU.
- unionPropertyNumber: RIP da SPU, só se aparecer.
- owners: os proprietários atuais e seus cônjuges, conforme o último registro de aquisição da matrícula ou os documentos pessoais. Não inclua donos antigos que já venderam. documentNumber é o CPF ou CNPJ com os dígitos que aparecem, ou null.`;

const READING_SCHEMA = {
  name: "property_legal_profile",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "city",
      "state",
      "registrationNumber",
      "registryOffice",
      "propertyTaxNumber",
      "unionPropertyNumber",
      "owners",
    ],
    properties: {
      city: { type: ["string", "null"] },
      state: { type: ["string", "null"] },
      registrationNumber: { type: ["string", "null"] },
      registryOffice: { type: ["string", "null"] },
      propertyTaxNumber: { type: ["string", "null"] },
      unionPropertyNumber: { type: ["string", "null"] },
      owners: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "documentNumber"],
          properties: {
            name: { type: "string" },
            documentNumber: { type: ["string", "null"] },
          },
        },
      },
    },
  },
};

interface ReadingAnswer {
  city: string | null;
  state: string | null;
  registrationNumber: string | null;
  registryOffice: string | null;
  propertyTaxNumber: string | null;
  unionPropertyNumber: string | null;
  owners: { name: string; documentNumber: string | null }[];
}

const trimmedOrNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const nameKey = (name: string) =>
  name
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replaceAll(/\s+/g, " ")
    .trim();

/**
 * What the public portals ask about a property, filled by itself as much as
 * it can: the address, the owners known from contacts and signed deals, and
 * the documents already stored, read by the AI.
 */
@Injectable()
export class PropertyLegalProfileService {
  private readonly logger = new Logger(PropertyLegalProfileService.name);

  constructor(
    @InjectRepository(PropertyLegalProfile)
    private readonly profileRepository: Repository<PropertyLegalProfile>,
    @InjectRepository(PropertyContact)
    private readonly contactRepository: Repository<PropertyContact>,
    @InjectRepository(DealSigner)
    private readonly signerRepository: Repository<DealSigner>,
    private readonly propertyService: PropertyService,
    private readonly documentService: DocumentService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
    private readonly pricingService: CreditPricingService,
  ) {}

  /** The saved profile, or a new one filled with what the system knows. */
  async profileOf(user: User, propertyId: string) {
    const existing = await this.profileRepository.findOneBy({
      userId: user.id,
      propertyId,
    });
    if (existing) return existing;

    const property = await this.propertyService.findOne(user, propertyId);
    const location =
      locationFromAddress(property.address) ??
      (await this.geocode(property.address));
    const signedOwners = (await this.ownerSuggestions(user, propertyId, []))
      .filter((suggestion) => suggestion.documentNumber)
      .map((suggestion) => ({
        name: suggestion.name,
        documentNumber: suggestion.documentNumber!,
      }));

    const profile = this.profileRepository.create({
      userId: user.id,
      propertyId,
      city: location?.city ?? null,
      state: location?.state ?? null,
      registrationNumber: null,
      registryOffice: null,
      propertyTaxNumber: null,
      unionPropertyNumber: null,
      owners: signedOwners,
    });
    try {
      return await this.profileRepository.save(profile);
    } catch {
      // Opened twice at the same time, the other request saved it first.
      return this.profileRepository.findOneByOrFail({
        userId: user.id,
        propertyId,
      });
    }
  }

  /** People who may own the property and are not in the profile yet. */
  async ownerSuggestions(
    user: User,
    propertyId: string,
    owners: PropertyLegalOwner[],
  ): Promise<OwnerSuggestion[]> {
    const [contacts, sellers] = await Promise.all([
      this.contactRepository.find({
        where: { userId: user.id, propertyId, active: true },
      }),
      this.signerRepository.find({
        where: {
          role: DealSignerRole.SELLER,
          active: true,
          deal: { userId: user.id, propertyId },
        },
      }),
    ]);

    const suggestions: OwnerSuggestion[] = [
      ...sellers.map((seller) => ({
        name: seller.signedName || seller.name,
        documentNumber: normalizeTaxDocument(seller.signedDocumentNumber ?? ""),
        source: "deal" as const,
      })),
      ...contacts.flatMap((contact) =>
        contact.name?.trim()
          ? [
              {
                name: contact.name.trim(),
                documentNumber: null,
                source: "contact" as const,
              },
            ]
          : [],
      ),
    ];
    return this.withoutKnownOwners(suggestions, owners);
  }

  async save(user: User, propertyId: string, dto: PropertyLegalProfileSaveDto) {
    const profile = await this.profileOf(user, propertyId);

    const owners: PropertyLegalOwner[] = [];
    for (const owner of dto.owners) {
      const documentNumber = normalizeTaxDocument(owner.documentNumber);
      if (!documentNumber) {
        throw new BadRequestException(
          `O CPF ou CNPJ de ${owner.name.trim()} não é válido.`,
        );
      }
      if (owners.some((saved) => saved.documentNumber === documentNumber)) {
        continue;
      }
      owners.push({ name: owner.name.trim(), documentNumber });
    }

    profile.city = trimmedOrNull(dto.city);
    profile.state = stateAbbreviationOf(dto.state);
    profile.registrationNumber = trimmedOrNull(dto.registrationNumber);
    profile.registryOffice = trimmedOrNull(dto.registryOffice);
    profile.propertyTaxNumber = trimmedOrNull(dto.propertyTaxNumber);
    profile.unionPropertyNumber = trimmedOrNull(dto.unionPropertyNumber);
    profile.owners = owners;

    return this.profileRepository.save(profile);
  }

  /** Stored files the AI can read to fill the profile. */
  async readableDocuments(user: User, propertyId: string) {
    const documents = await this.documentService.findAllByOwner(
      user.id,
      DocumentOwnerType.PROPERTY,
      propertyId,
    );
    return documents
      .filter(
        (document) =>
          document.category &&
          READABLE_CATEGORIES.includes(document.category) &&
          READABLE_MIME_TYPES.has(document.mimeType) &&
          Number(document.sizeBytes) <= MAXIMUM_FILE_BYTES,
      )
      .sort(
        (first, second) =>
          READABLE_CATEGORIES.indexOf(first.category!) -
          READABLE_CATEGORIES.indexOf(second.category!),
      )
      .slice(0, MAXIMUM_FILES_READ);
  }

  readingPriceInCredits() {
    return this.pricingService.featurePrice("property_document_reading");
  }

  /**
   * The AI reads the registration, IPTU and IDs already stored and fills the
   * blanks. What the broker typed is never replaced.
   */
  async readDocuments(user: User, propertyId: string) {
    const profile = await this.profileOf(user, propertyId);
    const documents = await this.readableDocuments(user, propertyId);
    if (!documents.length) {
      throw new BadRequestException(
        "Guarde a matrícula, o IPTU ou o RG dos donos no checklist para a IA ler.",
      );
    }

    const withKeys = await this.documentService.findManyWithKeys(
      user.id,
      documents.map((document) => document.id),
    );
    const images: string[] = [];
    const files: { fileName: string; dataUrl: string }[] = [];
    let totalBytes = 0;
    for (const document of withKeys) {
      if (totalBytes + Number(document.sizeBytes) > MAXIMUM_TOTAL_BYTES) break;
      const buffer = await this.storageService.downloadObject(document.s3Key);
      totalBytes += buffer.length;
      const dataUrl = `data:${document.mimeType};base64,${buffer.toString("base64")}`;
      if (document.mimeType === "application/pdf") {
        files.push({ fileName: document.displayName, dataUrl });
      } else {
        images.push(dataUrl);
      }
    }

    const result = await this.aiService.generate(user.id, {
      feature: "property_document_reading",
      instructions: READING_INSTRUCTIONS,
      input: `Documentos guardados: ${withKeys
        .map((document) => document.displayName)
        .join("; ")}`,
      images,
      imageDetail: "high",
      files,
      jsonSchema: READING_SCHEMA,
      referenceId: propertyId,
    });

    let answer: ReadingAnswer;
    try {
      answer = JSON.parse(result.text) as ReadingAnswer;
    } catch {
      this.logger.warn(`Unreadable answer for property ${propertyId}`);
      answer = {
        city: null,
        state: null,
        registrationNumber: null,
        registryOffice: null,
        propertyTaxNumber: null,
        unionPropertyNumber: null,
        owners: [],
      };
    }

    const filledFields: string[] = [];
    const found: Record<PublicLookupProfileField, string | null> = {
      city: trimmedOrNull(answer.city),
      state: stateAbbreviationOf(answer.state),
      registrationNumber: trimmedOrNull(answer.registrationNumber),
      registryOffice: trimmedOrNull(answer.registryOffice),
      propertyTaxNumber: trimmedOrNull(answer.propertyTaxNumber),
      unionPropertyNumber: trimmedOrNull(answer.unionPropertyNumber),
    };
    for (const field of PROFILE_TEXT_FIELDS) {
      if (!profile[field] && found[field]) {
        profile[field] = found[field];
        filledFields.push(publicLookupProfileFieldLabels[field]);
      }
    }

    const ownersWithoutDocument: OwnerSuggestion[] = [];
    for (const owner of answer.owners ?? []) {
      const name = owner.name?.trim();
      if (!name) continue;
      const documentNumber = normalizeTaxDocument(owner.documentNumber ?? "");
      if (!documentNumber) {
        ownersWithoutDocument.push({
          name,
          documentNumber: null,
          source: "document",
        });
        continue;
      }
      if (
        profile.owners.some((saved) => saved.documentNumber === documentNumber)
      ) {
        continue;
      }
      profile.owners = [...profile.owners, { name, documentNumber }];
      filledFields.push(name);
    }

    await this.profileRepository.save(profile);
    return {
      profile,
      filledFields,
      ownerSuggestions: this.withoutKnownOwners(
        ownersWithoutDocument,
        profile.owners,
      ),
      creditsCharged: result.creditsCharged,
    };
  }

  private withoutKnownOwners(
    suggestions: OwnerSuggestion[],
    owners: PropertyLegalOwner[],
  ) {
    const knownNames = new Set(owners.map((owner) => nameKey(owner.name)));
    const knownDocuments = new Set(owners.map((owner) => owner.documentNumber));
    const unique: OwnerSuggestion[] = [];
    for (const suggestion of suggestions) {
      const key = nameKey(suggestion.name);
      if (
        knownNames.has(key) ||
        (suggestion.documentNumber &&
          knownDocuments.has(suggestion.documentNumber)) ||
        unique.some((saved) => nameKey(saved.name) === key)
      ) {
        continue;
      }
      unique.push(suggestion);
    }
    return unique;
  }

  /** City and state from the free map search, when the address has no state. */
  private async geocode(address: string | null | undefined) {
    if (!address?.trim()) return null;
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?limit=1&q=${encodeURIComponent(address)}`,
        { signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MILLISECONDS) },
      );
      if (!response.ok) return null;
      const body = (await response.json()) as {
        features?: {
          properties?: { city?: string; state?: string; countrycode?: string };
        }[];
      };
      const properties = body.features?.[0]?.properties;
      const state = stateAbbreviationOf(properties?.state);
      if (properties?.countrycode !== "BR" || !properties.city || !state) {
        return null;
      }
      return { city: properties.city, state };
    } catch {
      return null;
    }
  }
}
