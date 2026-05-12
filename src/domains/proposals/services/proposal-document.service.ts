import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { ProposalDocument, ProposalDocumentCategory } from "../entities/proposal-document.entity";
import { ProposalMapper } from "../mappers/proposal.mapper";

export class UploadProposalDocumentDto {
  @IsEnum(ProposalDocumentCategory)
  category: ProposalDocumentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsString()
  partyId?: string | null;
}

export class RenameProposalDocumentDto {
  @IsString()
  @MaxLength(255)
  displayName: string;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

@Injectable()
export class ProposalDocumentService {
  constructor(
    @InjectRepository(ProposalDocument)
    private readonly documentRepository: Repository<ProposalDocument>,
    private readonly storageService: StorageService,
  ) {}

  async findAllByProposal(proposalId: string) {
    return this.documentRepository.find({
      where: { proposalId, active: true },
      relations: { party: true },
      order: { createdAt: "DESC" },
    });
  }

  async upload(
    userId: string,
    proposalId: string,
    dto: UploadProposalDocumentDto,
    file: Express.Multer.File,
  ) {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        "Tipo de arquivo não permitido. Tipos aceitos: PDF, imagens, Word, Excel, texto.",
      );
    }

    const { s3Key, mimeType, sizeBytes } = await this.storageService.uploadDocument(
      file.buffer,
      file.originalname,
      file.mimetype,
      userId,
      "proposals",
      proposalId,
    );

    const doc = new ProposalDocument();
    doc.proposalId = proposalId;
    doc.partyId = dto.partyId ?? null;
    doc.category = dto.category;
    doc.displayName = dto.displayName ?? file.originalname.substring(0, 255);
    doc.s3Key = s3Key;
    doc.mimeType = mimeType;
    doc.sizeBytes = sizeBytes;

    const saved = await this.documentRepository.save(doc);
    return ProposalMapper.toDocumentDto(saved);
  }

  async getPresignedUrl(userId: string, proposalId: string, documentId: string) {
    const doc = await this.findDocumentOrThrow(proposalId, documentId);
    const url = await this.storageService.getPresignedUrl(doc.s3Key);
    return { url, expiresIn: 900 };
  }

  async getPresignedUrlPublic(proposalId: string, documentId: string, partyId: string) {
    const doc = await this.findDocumentOrThrow(proposalId, documentId);
    if (doc.partyId !== partyId && doc.partyId !== null) {
      throw new NotFoundException("Documento não encontrado.");
    }
    const url = await this.storageService.getPresignedUrl(doc.s3Key);
    return { url, expiresIn: 900 };
  }

  async rename(
    proposalId: string,
    documentId: string,
    displayName: string,
  ) {
    const doc = await this.findDocumentOrThrow(proposalId, documentId);
    doc.displayName = displayName;
    const saved = await this.documentRepository.save(doc);
    return ProposalMapper.toDocumentDto(saved);
  }

  async remove(proposalId: string, documentId: string) {
    const doc = await this.findDocumentOrThrow(proposalId, documentId);
    await this.storageService.deleteObject(doc.s3Key);
    doc.active = false;
    await this.documentRepository.save(doc);
  }

  async removePublic(proposalId: string, documentId: string, partyId: string) {
    const doc = await this.findDocumentOrThrow(proposalId, documentId);
    if (doc.partyId !== partyId) {
      throw new NotFoundException("Documento não encontrado.");
    }
    await this.storageService.deleteObject(doc.s3Key);
    doc.active = false;
    await this.documentRepository.save(doc);
  }

  private async findDocumentOrThrow(proposalId: string, documentId: string) {
    const doc = await this.documentRepository
      .createQueryBuilder("doc")
      .addSelect("doc.s3Key")
      .where("doc.id = :documentId", { documentId })
      .andWhere("doc.proposalId = :proposalId", { proposalId })
      .andWhere("doc.active = :active", { active: true })
      .getOne();

    if (!doc) {
      throw new NotFoundException("Documento não encontrado.");
    }
    return doc;
  }
}
