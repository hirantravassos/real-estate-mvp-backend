import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import sharp from "sharp";
import { Repository } from "typeorm";
import { appConfig } from "../../../config/app.config";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { Customer } from "../../customers/entities/customer.entity";
import {
  Document,
  DocumentOwnerType,
} from "../../documents/entities/document.entity";
import { DocumentService } from "../../documents/services/document.service";
import {
  describePropertyFacts,
  KIND_LABEL,
} from "../../inbox/helpers/property-pitch.helper";
import {
  PropertyMedia,
  PropertyMediaType,
} from "../../properties/entities/property-media.entity";
import { Property } from "../../properties/entities/property.entity";
import { PropertyMapper } from "../../properties/mappers/property.mapper";
import { User } from "../../users/entities/user.entity";
import {
  AssistantUploadDto,
  AssistantUploadRequestDto,
} from "../dtos/assistant.dto";
import {
  DOCUMENT_MIME_TYPE,
  DocumentBlockType,
  DocumentFormat,
  RenderBlock,
  RenderedProperty,
  safeFileName,
} from "../helpers/document-spec.helper";
import { renderDocx } from "../helpers/docx-renderer.helper";
import { formatDay } from "../helpers/assistant-format.helper";
import { renderPdf } from "../helpers/pdf-renderer.helper";

const MAXIMUM_BLOCKS = 200;
const MAXIMUM_PROPERTY_BLOCKS = 20;
const MAXIMUM_TEXT_LENGTH = 20_000;
const MAXIMUM_TABLE_ROWS = 300;
const PHOTO_WIDTH = 1200;

/** What the model asked for, still to be checked. */
export interface DocumentRequest {
  title: string;
  subtitle: string | null;
  fileName: string | null;
  format: DocumentFormat;
  customerId: string | null;
  propertyId: string | null;
  blocks: unknown[];
}

export interface AssistantFileDto {
  id: string;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
}

const BLOCK_TYPES = new Set<DocumentBlockType>([
  "heading",
  "paragraph",
  "bullets",
  "fields",
  "table",
  "property",
  "signatures",
  "page_break",
]);

const clean = (value: unknown, maximum = MAXIMUM_TEXT_LENGTH) =>
  typeof value === "string" ? value.trim().substring(0, maximum) : "";

const strings = (value: unknown, maximum: number) =>
  (Array.isArray(value) ? value : [])
    .map((item) => clean(item, 2000))
    .filter(Boolean)
    .slice(0, maximum);

export const toFileDto = (document: Document): AssistantFileDto => ({
  id: document.id,
  displayName: document.displayName,
  mimeType: document.mimeType,
  sizeBytes: Number(document.sizeBytes),
});

/**
 * Writes PDFs and Word files for the broker, and keeps the files attached
 * in the assistant chat. A file about a customer or a property is saved in
 * their documents too.
 */
@Injectable()
export class AssistantDocumentService {
  private readonly logger = new Logger(AssistantDocumentService.name);

  constructor(
    @Inject(appConfig.KEY)
    private readonly applicationConfiguration: ConfigType<typeof appConfig>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(PropertyMedia)
    private readonly mediaRepository: Repository<PropertyMedia>,
    private readonly documentService: DocumentService,
    private readonly storageService: StorageService,
  ) {}

  async generate(user: User, request: DocumentRequest, timezone: string) {
    const title = clean(request.title, 200);
    if (!title) throw new BadRequestException("O documento precisa de título.");
    if (!request.blocks.length) {
      throw new BadRequestException("O documento está vazio.");
    }
    if (request.blocks.length > MAXIMUM_BLOCKS) {
      throw new BadRequestException(
        "Documento grande demais, divida em partes.",
      );
    }

    const owner = await this.ownerOf(user, request);
    const blocks = await this.resolveBlocks(user, request.blocks);
    if (!blocks.length)
      throw new BadRequestException("O documento está vazio.");

    const renderable = {
      title,
      subtitle: clean(request.subtitle, 300) || null,
      author: user.name,
      date: formatDay(new Date(), timezone),
      blocks,
    };
    const buffer =
      request.format === "docx"
        ? await renderDocx(renderable)
        : await renderPdf(renderable);

    const document = await this.documentService.uploadBuffer(
      user.id,
      owner.type,
      owner.id,
      owner.domain,
      {
        buffer,
        fileName: safeFileName(
          clean(request.fileName) || title,
          request.format,
        ),
        mimeType: DOCUMENT_MIME_TYPE[request.format],
      },
    );
    return { document, savedTo: owner.label };
  }

  /** Where the browser uploads a file attached in the assistant chat. */
  async presignUpload(user: User, dto: AssistantUploadRequestDto) {
    this.storageService.validateInboxUpload(dto.mimeType, dto.sizeBytes);
    const s3Key = this.storageService.generateAssistantS3Key(
      user.id,
      dto.fileName,
    );
    const uploadUrl = await this.storageService.generatePresignedUploadUrl(
      s3Key,
      dto.mimeType,
    );
    return { uploadUrl, s3Key };
  }

  /** Records the uploaded file so the assistant can send it on WhatsApp. */
  async registerUpload(user: User, dto: AssistantUploadDto) {
    if (
      !dto.s3Key.startsWith(this.storageService.assistantS3KeyPrefix(user.id))
    ) {
      throw new BadRequestException("Chave de armazenamento inválida.");
    }
    const { sizeBytes } = await this.storageService.verifyObjectExists(
      dto.s3Key,
    );
    this.storageService.validateInboxUpload(dto.mimeType, sizeBytes);

    const document = await this.documentService.register(
      user.id,
      DocumentOwnerType.ASSISTANT,
      user.id,
      {
        s3Key: dto.s3Key,
        displayName: dto.fileName,
        mimeType: dto.mimeType.split(";")[0].trim(),
        sizeBytes,
      },
    );
    return toFileDto(document);
  }

  async downloadUrl(user: User, documentId: string) {
    const document = await this.documentService.findOneOrThrow(
      user.id,
      documentId,
    );
    return {
      url: await this.storageService.getPresignedUrl(document.s3Key, {
        downloadFileName: document.displayName,
      }),
    };
  }

  /** The broker's files picked for a question, in the order they were sent. */
  async filesOf(user: User, documentIds: string[]) {
    const documents = await this.documentService.findManyWithKeys(
      user.id,
      documentIds,
    );
    if (documents.length !== new Set(documentIds).size) {
      throw new NotFoundException("Algum anexo não foi encontrado.");
    }
    const byId = new Map(documents.map((document) => [document.id, document]));
    return documentIds
      .map((id) => byId.get(id))
      .filter((document): document is Document => Boolean(document))
      .map(toFileDto);
  }

  private async ownerOf(user: User, request: DocumentRequest) {
    if (request.customerId) {
      const customer = await this.customerRepository.findOneBy({
        id: request.customerId,
        userId: user.id,
        active: true,
      });
      if (!customer) throw new NotFoundException("Cliente não encontrado.");
      return {
        type: DocumentOwnerType.CUSTOMER,
        id: customer.id,
        domain: "customers" as const,
        label: `documentos de ${customer.name}`,
      };
    }
    if (request.propertyId) {
      const property = await this.findProperty(user, request.propertyId);
      return {
        type: DocumentOwnerType.PROPERTY,
        id: property.id,
        domain: "properties" as const,
        label: `documentos do imóvel ${this.propertyTitle(property)}`,
      };
    }
    return {
      type: DocumentOwnerType.ASSISTANT,
      id: user.id,
      domain: "assistant" as const,
      label: null,
    };
  }

  private async resolveBlocks(user: User, rawBlocks: unknown[]) {
    const blocks: RenderBlock[] = [];
    let propertyBlocks = 0;

    for (const raw of rawBlocks) {
      if (!raw || typeof raw !== "object") continue;
      const block = raw as Record<string, unknown>;
      const type = block.type as DocumentBlockType;
      if (!BLOCK_TYPES.has(type)) continue;

      if (type === "heading" || type === "paragraph") {
        const text = clean(block.text, type === "heading" ? 300 : undefined);
        if (text) blocks.push({ type, text });
      } else if (type === "bullets" || type === "signatures") {
        const items = strings(block.items, 100);
        if (!items.length) continue;
        blocks.push(
          type === "bullets"
            ? { type, items }
            : { type, names: items.slice(0, 10) },
        );
      } else if (type === "fields") {
        const fields = (Array.isArray(block.fields) ? block.fields : [])
          .map((field: { label?: unknown; value?: unknown }) => ({
            label: clean(field?.label, 200),
            value: clean(field?.value, 4000),
          }))
          .filter((field) => field.label)
          .slice(0, 100);
        if (fields.length) blocks.push({ type, fields });
      } else if (type === "table") {
        const columns = strings(block.columns, 8);
        if (!columns.length) continue;
        const rows = (Array.isArray(block.rows) ? block.rows : [])
          .slice(0, MAXIMUM_TABLE_ROWS)
          .map((row) =>
            (Array.isArray(row) ? row : [])
              .slice(0, columns.length)
              .map((value) => clean(value, 1000)),
          );
        blocks.push({ type, columns, rows });
      } else if (type === "property") {
        if (++propertyBlocks > MAXIMUM_PROPERTY_BLOCKS) continue;
        const propertyId = clean(block.propertyId, 64);
        if (!propertyId) continue;
        blocks.push({
          type,
          property: await this.renderProperty(user, propertyId),
        });
      } else {
        blocks.push({ type: "page_break" });
      }
    }
    return blocks;
  }

  private async renderProperty(
    user: User,
    propertyId: string,
  ): Promise<RenderedProperty> {
    const property = await this.findProperty(user, propertyId);
    return {
      title: this.propertyTitle(property),
      facts: describePropertyFacts(PropertyMapper.toDto(property)),
      link: `${this.applicationConfiguration.frontendUrl}/p/${property.id}`,
      photo: await this.coverPhotoOf(user, property.id),
    };
  }

  /** The cover, or the first photo, as a JPEG small enough for a document. */
  private async coverPhotoOf(user: User, propertyId: string) {
    const media = await this.mediaRepository
      .createQueryBuilder("media")
      .addSelect("media.s3Key")
      .where("media.propertyId = :propertyId", { propertyId })
      .andWhere("media.userId = :userId", { userId: user.id })
      .andWhere("media.active = :active", { active: true })
      .andWhere("media.type = :type", { type: PropertyMediaType.IMAGE })
      .andWhere("media.visibleToCustomer = :visible", { visible: true })
      .orderBy("media.isCover", "DESC")
      .addOrderBy("media.sortOrder", "ASC")
      .getOne();
    if (!media) return null;

    try {
      const original = await this.storageService.downloadObject(media.s3Key);
      const { data, info } = await sharp(original)
        .rotate()
        .resize({ width: PHOTO_WIDTH, withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      return { buffer: data, width: info.width, height: info.height };
    } catch (error) {
      this.logger.warn(`Cover of ${propertyId} left out: ${String(error)}`);
      return null;
    }
  }

  private async findProperty(user: User, propertyId: string) {
    const property = await this.propertyRepository.findOneBy({
      id: propertyId,
      userId: user.id,
      active: true,
    });
    if (!property) throw new NotFoundException("Imóvel não encontrado.");
    return property;
  }

  private propertyTitle(property: Property) {
    return (
      property.alias ??
      [property.kind ? KIND_LABEL[property.kind] : "Imóvel", property.address]
        .filter(Boolean)
        .join(" em ")
        .substring(0, 120)
    );
  }
}
