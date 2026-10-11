import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InfosimplesService } from "../../../infrastructure/infosimples/services/infosimples.service";
import {
  INFOSIMPLES_NOT_FOUND_CODE,
  INFOSIMPLES_SUCCESS_CODE,
  InfosimplesConsultation,
} from "../../../infrastructure/infosimples/types/infosimples.type";
import { CreditPricingService } from "../../credits/services/credit-pricing.service";
import { CreditWalletService } from "../../credits/services/credit-wallet.service";
import {
  Document,
  DocumentOwnerType,
} from "../../documents/entities/document.entity";
import { DocumentMapper } from "../../documents/mappers/document.mapper";
import { DocumentService } from "../../documents/services/document.service";
import { PropertyKindEnum } from "../../properties/mappers/property.mapper";
import { PropertyService } from "../../properties/services/property.service";
import { User } from "../../users/entities/user.entity";
import {
  PUBLIC_LOOKUPS,
  PublicLookupContext,
  PublicLookupDefinition,
  publicLookupProfileFieldLabels,
  findPublicLookup,
} from "../constants/public-lookups.constant";
import {
  PropertyDocumentLookupRunDto,
  PropertyLegalProfileSaveDto,
} from "../dtos/document-lookup.dto";
import {
  PropertyDocumentLookup,
  PropertyDocumentLookupStatus,
} from "../entities/property-document-lookup.entity";
import {
  PropertyLegalOwner,
  PropertyLegalProfile,
} from "../entities/property-legal-profile.entity";
import { normalizeTaxDocument } from "../helpers/tax-document.helper";
import { PropertyLegalProfileService } from "./property-legal-profile.service";

const STORABLE_RECEIPT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const extensionByMimeType: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const fileNameSafe = (value: string) =>
  value
    .replaceAll(/[\\/:*?"<>|]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();

/**
 * Fetches the public certificates of a property and of its owners: on its
 * own through Infosimples when it can, or by opening the right portal.
 */
@Injectable()
export class DocumentLookupService {
  private readonly logger = new Logger(DocumentLookupService.name);
  /** Lookups running now, so a double click never pays twice. */
  private readonly runningLookups = new Set<string>();

  constructor(
    @InjectRepository(PropertyDocumentLookup)
    private readonly lookupRepository: Repository<PropertyDocumentLookup>,
    private readonly propertyService: PropertyService,
    private readonly documentService: DocumentService,
    private readonly infosimplesService: InfosimplesService,
    private readonly pricingService: CreditPricingService,
    private readonly walletService: CreditWalletService,
    private readonly profileService: PropertyLegalProfileService,
  ) {}

  async overview(user: User, propertyId: string) {
    const property = await this.propertyService.findOne(user, propertyId);
    const profile = await this.profileService.profileOf(user, propertyId);
    const history = await this.lookupRepository.find({
      where: { userId: user.id, propertyId, active: true },
      order: { createdAt: "DESC" },
      take: 100,
    });
    const priceInCredits = this.estimatedPriceInCredits();

    const definitions = PUBLIC_LOOKUPS.filter(
      (definition) =>
        definition.key !== "occupancy_permit" ||
        (property.kind !== PropertyKindEnum.APARTMENT &&
          property.kind !== PropertyKindEnum.LAND),
    );

    const items = definitions.flatMap((definition) => {
      const owners: (PropertyLegalOwner | null)[] = definition.perOwner
        ? profile.owners
        : [null];
      return owners.map((owner) => {
        const context: PublicLookupContext = { profile, owner };
        const missingFields = (definition.automatic?.requiredFields ?? [])
          .filter((field) => !profile[field])
          .map((field) => publicLookupProfileFieldLabels[field]);
        const lastRun =
          history.find(
            (lookup) =>
              lookup.lookupKey === definition.key &&
              lookup.ownerDocumentNumber === (owner?.documentNumber ?? null),
          ) ?? null;

        return {
          key: definition.key,
          category: definition.category,
          title: definition.title,
          source: definition.source,
          manualHint: definition.manualHint,
          manualUrl: definition.manualUrl(context),
          ownerName: owner?.name ?? null,
          ownerDocumentNumber: owner?.documentNumber ?? null,
          automatic: Boolean(definition.automatic),
          missingFields,
          priceInCredits: definition.automatic ? priceInCredits : null,
          lastRun: lastRun && {
            status: lastRun.status,
            message: lastRun.message,
            creditsCharged: lastRun.creditsCharged,
            documentIds: lastRun.documentIds,
            createdAt: lastRun.createdAt,
          },
        };
      });
    });

    const [ownerSuggestions, readableDocuments] = await Promise.all([
      this.profileService.ownerSuggestions(user, propertyId, profile.owners),
      this.profileService.readableDocuments(user, propertyId),
    ]);

    return {
      automaticAvailable: this.infosimplesService.isConfigured,
      needsOwners:
        profile.owners.length === 0 &&
        definitions.some((definition) => definition.perOwner),
      profile: this.toProfileDto(profile),
      ownerSuggestions,
      readableDocumentCount: readableDocuments.length,
      readingPriceInCredits: this.profileService.readingPriceInCredits(),
      items,
    };
  }

  async saveProfile(
    user: User,
    propertyId: string,
    dto: PropertyLegalProfileSaveDto,
  ) {
    await this.propertyService.findOne(user, propertyId);
    return this.toProfileDto(
      await this.profileService.save(user, propertyId, dto),
    );
  }

  /** The AI fills the blanks from the registration, IPTU and IDs stored. */
  async readDocuments(user: User, propertyId: string) {
    await this.propertyService.findOne(user, propertyId);
    const result = await this.profileService.readDocuments(user, propertyId);
    return { ...result, profile: this.toProfileDto(result.profile) };
  }

  async run(
    user: User,
    propertyId: string,
    lookupKey: string,
    dto: PropertyDocumentLookupRunDto,
  ) {
    await this.propertyService.findOne(user, propertyId);
    const definition = findPublicLookup(lookupKey);
    if (!definition) {
      throw new NotFoundException("Certidão desconhecida.");
    }
    if (!definition.automatic) {
      throw new BadRequestException(
        "Essa certidão é emitida direto no portal, pelo link indicado.",
      );
    }
    if (!this.infosimplesService.isConfigured) {
      throw new ServiceUnavailableException(
        "A busca automática de certidões não está configurada.",
      );
    }

    const profile = await this.profileService.profileOf(user, propertyId);
    const owner = this.ownerFor(definition, profile, dto);
    const missingFields = definition.automatic.requiredFields.filter(
      (field) => !profile[field],
    );
    if (missingFields.length) {
      throw new BadRequestException(
        `Preencha antes: ${missingFields
          .map((field) => publicLookupProfileFieldLabels[field])
          .join(", ")}.`,
      );
    }

    const runningKey = `${propertyId}:${definition.key}:${owner?.documentNumber ?? ""}`;
    if (this.runningLookups.has(runningKey)) {
      throw new ConflictException("Essa certidão já está sendo buscada.");
    }

    await this.walletService.ensureBalance(
      user.id,
      this.estimatedPriceInCredits(),
    );

    this.runningLookups.add(runningKey);
    try {
      const consultation = await this.infosimplesService.consult(
        definition.automatic.path,
        definition.automatic.parameters({ profile, owner }),
      );
      const creditsCharged = await this.charge(
        user,
        definition,
        owner,
        consultation,
      );
      const documents =
        consultation.code === INFOSIMPLES_SUCCESS_CODE
          ? await this.storeReceipts(
              user,
              propertyId,
              definition,
              owner,
              consultation.receiptUrls,
            )
          : [];

      const { status, message } = this.outcomeOf(
        consultation,
        documents.length,
      );
      const lookup = await this.lookupRepository.save(
        this.lookupRepository.create({
          userId: user.id,
          propertyId,
          lookupKey: definition.key,
          ownerDocumentNumber: owner?.documentNumber ?? null,
          status,
          message: message.substring(0, 255),
          creditsCharged,
          providerCostInBrl:
            consultation.billable && consultation.priceInBrl !== null
              ? consultation.priceInBrl.toFixed(4)
              : null,
          documentIds: documents.map((document) => document.id),
        }),
      );

      return {
        status: lookup.status,
        message: lookup.message,
        creditsCharged,
        documents: documents.map((document) => DocumentMapper.toDto(document)),
        /** Short lived, to open the answer when no file could be stored. */
        receiptUrls: documents.length ? [] : consultation.receiptUrls,
        manualUrl: definition.manualUrl({ profile, owner }),
      };
    } finally {
      this.runningLookups.delete(runningKey);
    }
  }

  private estimatedPriceInCredits() {
    return this.pricingService.creditsForCostInBrl(
      this.infosimplesService.estimatedCostInBrl,
    );
  }

  private ownerFor(
    definition: PublicLookupDefinition,
    profile: PropertyLegalProfile,
    dto: PropertyDocumentLookupRunDto,
  ) {
    if (!definition.perOwner) return null;
    const documentNumber = normalizeTaxDocument(dto.ownerDocumentNumber ?? "");
    const owner = profile.owners.find(
      (saved) => saved.documentNumber === documentNumber,
    );
    if (!owner) {
      throw new BadRequestException(
        "Escolha um proprietário cadastrado com CPF ou CNPJ.",
      );
    }
    return owner;
  }

  /** Only what Infosimples bills is charged, at the real price it answered. */
  private async charge(
    user: User,
    definition: PublicLookupDefinition,
    owner: PropertyLegalOwner | null,
    consultation: InfosimplesConsultation,
  ) {
    if (!consultation.billable) return 0;
    const costInBrl =
      consultation.priceInBrl ?? this.infosimplesService.estimatedCostInBrl;
    const { charged } = await this.walletService.spend(user.id, {
      amount: this.pricingService.creditsForCostInBrl(costInBrl),
      description: owner
        ? `${definition.title} de ${owner.name}`
        : definition.title,
      feature: "public_certificate",
      model: `infosimples:${definition.automatic?.path ?? definition.key}`,
    });
    return charged;
  }

  private async storeReceipts(
    user: User,
    propertyId: string,
    definition: PublicLookupDefinition,
    owner: PropertyLegalOwner | null,
    receiptUrls: string[],
  ) {
    const documents: Document[] = [];
    const baseName = fileNameSafe(
      owner ? `${definition.title} - ${owner.name}` : definition.title,
    );

    for (const url of receiptUrls) {
      const receipt = await this.infosimplesService.downloadReceipt(url);
      if (!receipt || !STORABLE_RECEIPT_MIME_TYPES.has(receipt.mimeType)) {
        continue;
      }
      const suffix = documents.length ? ` (${documents.length + 1})` : "";
      try {
        documents.push(
          await this.documentService.uploadBuffer(
            user.id,
            DocumentOwnerType.PROPERTY,
            propertyId,
            "properties",
            {
              buffer: receipt.buffer,
              fileName: `${baseName}${suffix}.${extensionByMimeType[receipt.mimeType]}`,
              mimeType: receipt.mimeType,
            },
            definition.category,
          ),
        );
      } catch (error) {
        this.logger.error(
          `Storing ${definition.key} for property ${propertyId} failed: ${String(error)}`,
        );
      }
    }
    return documents;
  }

  private outcomeOf(
    consultation: InfosimplesConsultation,
    storedDocuments: number,
  ): { status: PropertyDocumentLookupStatus; message: string } {
    if (consultation.code === INFOSIMPLES_SUCCESS_CODE) {
      return {
        status: PropertyDocumentLookupStatus.FOUND,
        message: storedDocuments
          ? "Certidão emitida e guardada nos documentos do imóvel."
          : "Certidão consultada, mas o portal não devolveu o arquivo. Abra o resultado e guarde à mão.",
      };
    }
    if (consultation.code === INFOSIMPLES_NOT_FOUND_CODE) {
      return {
        status: PropertyDocumentLookupStatus.NOT_FOUND,
        message: `O portal não encontrou nada para esses dados. ${consultation.message}`,
      };
    }
    return {
      status: PropertyDocumentLookupStatus.FAILED,
      message: `O portal não respondeu agora, tente de novo ou emita pelo link. ${consultation.message}`,
    };
  }

  private toProfileDto(profile: PropertyLegalProfile) {
    return {
      city: profile.city,
      state: profile.state,
      registrationNumber: profile.registrationNumber,
      registryOffice: profile.registryOffice,
      propertyTaxNumber: profile.propertyTaxNumber,
      unionPropertyNumber: profile.unionPropertyNumber,
      owners: profile.owners,
    };
  }
}
