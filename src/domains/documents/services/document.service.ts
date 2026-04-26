import { Injectable, NotFoundException } from "@nestjs/common";
import {
  Document,
  DocumentOwnerType,
} from "../entities/document.entity";
import { DocumentRepository } from "../repositories/document.repository";
import {
  DocumentOwnerDomain,
  StorageService,
} from "../../../infrastructure/storage/services/storage.service";

@Injectable()
export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly storageService: StorageService,
  ) {}

  async findAllByOwner(
    userId: string,
    ownerType: DocumentOwnerType,
    ownerId: string,
  ) {
    return this.documentRepository.find({
      where: { userId, ownerType, ownerId, active: true },
      order: { createdAt: "DESC" },
    });
  }

  async upload(
    userId: string,
    ownerType: DocumentOwnerType,
    ownerId: string,
    ownerDomain: DocumentOwnerDomain,
    file: Express.Multer.File,
  ): Promise<Document> {
    const { s3Key, mimeType, sizeBytes } =
      await this.storageService.uploadDocument(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId,
        ownerDomain,
        ownerId,
      );

    const document = new Document();
    document.userId = userId;
    document.ownerType = ownerType;
    document.ownerId = ownerId;
    document.displayName = file.originalname.substring(0, 255);
    document.s3Key = s3Key;
    document.mimeType = mimeType;
    document.sizeBytes = sizeBytes;

    return this.documentRepository.save(document);
  }

  async getPresignedUrl(
    userId: string,
    documentId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const document = await this.findOneOrThrow(userId, documentId);
    const url = await this.storageService.getPresignedUrl(document.s3Key);
    return { url, expiresIn: 900 };
  }

  async rename(
    userId: string,
    documentId: string,
    displayName: string,
  ): Promise<Document> {
    const document = await this.findOneOrThrow(userId, documentId);
    document.displayName = displayName;
    return this.documentRepository.save(document);
  }

  async remove(userId: string, documentId: string): Promise<void> {
    const document = await this.findOneOrThrow(userId, documentId);
    await this.storageService.deleteObject(document.s3Key);
    document.active = false;
    await this.documentRepository.save(document);
  }

  private async findOneOrThrow(
    userId: string,
    documentId: string,
  ): Promise<Document> {
    const document = await this.documentRepository
      .createQueryBuilder("document")
      .addSelect("document.s3Key")
      .where("document.id = :documentId", { documentId })
      .andWhere("document.userId = :userId", { userId })
      .andWhere("document.active = :active", { active: true })
      .getOne();

    if (!document) {
      throw new NotFoundException("Documento não encontrado.");
    }

    return document;
  }
}
