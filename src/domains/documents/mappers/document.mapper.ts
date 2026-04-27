import { Document } from "../entities/document.entity";

export class DocumentMapper {
  static toDto(document: Document) {
    return {
      id: document.id,
      displayName: document.displayName,
      mimeType: document.mimeType,
      sizeBytes: Number(document.sizeBytes),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
