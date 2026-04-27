import { PropertyMedia } from "../entities/property-media.entity";

export class PropertyMediaMapper {
  static toDto(media: PropertyMedia) {
    return {
      id: media.id,
      type: media.type,
      displayName: media.displayName,
      mimeType: media.mimeType,
      sizeBytes: Number(media.sizeBytes),
      sortOrder: media.sortOrder,
      isCover: media.isCover,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
    };
  }
}
