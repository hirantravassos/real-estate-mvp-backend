import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PropertyMedia, PropertyMediaType } from "../entities/property-media.entity";
import { PropertyMediaRepository } from "../repositories/property-media.repository";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import {
  MediaConfirmUploadDto,
  MediaPresignedUploadRequestDto,
  MediaReorderDto,
  MediaUpdateDto,
} from "../dtos/property-media.dto";

@Injectable()
export class PropertyMediaService {
  constructor(
    private readonly mediaRepository: PropertyMediaRepository,
    private readonly storageService: StorageService,
  ) {}

  async findAllByProperty(userId: string, propertyId: string) {
    return this.mediaRepository.find({
      where: { userId, propertyId, active: true },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
  }

  async generatePresignedUpload(
    userId: string,
    propertyId: string,
    dto: MediaPresignedUploadRequestDto,
  ) {
    this.storageService.validateMediaUpload(dto.mimeType, dto.sizeBytes);

    const s3Key = this.storageService.generateMediaS3Key(
      userId,
      propertyId,
      dto.fileName,
    );

    const uploadUrl = await this.storageService.generatePresignedUploadUrl(
      s3Key,
      dto.mimeType,
    );

    return { uploadUrl, s3Key };
  }

  async confirmUpload(
    userId: string,
    propertyId: string,
    dto: MediaConfirmUploadDto,
  ): Promise<PropertyMedia> {
    const expectedPrefix = `media/${userId}/properties/${propertyId}/`;
    if (!dto.s3Key.startsWith(expectedPrefix)) {
      throw new BadRequestException("Chave de armazenamento inválida.");
    }

    const mediaType = this.storageService.validateMediaUpload(
      dto.mimeType,
      dto.sizeBytes,
    );

    const { sizeBytes: actualSize } =
      await this.storageService.verifyObjectExists(dto.s3Key);

    if (Math.abs(actualSize - dto.sizeBytes) > 1024) {
      throw new BadRequestException(
        "Tamanho do arquivo não corresponde ao declarado.",
      );
    }

    const maxOrder = await this.mediaRepository.maximum("sortOrder", {
      userId,
      propertyId,
      active: true,
    });

    const media = new PropertyMedia();
    media.userId = userId;
    media.propertyId = propertyId;
    media.type =
      mediaType === "image" ? PropertyMediaType.IMAGE : PropertyMediaType.VIDEO;
    media.displayName = dto.displayName.substring(0, 255);
    media.s3Key = dto.s3Key;
    media.mimeType = dto.mimeType;
    media.sizeBytes = actualSize;
    media.sortOrder = (maxOrder ?? -1) + 1;
    media.isCover = false;

    const saved = await this.mediaRepository.save(media);

    const hasImageCover = await this.mediaRepository.existsBy({
      userId,
      propertyId,
      active: true,
      type: PropertyMediaType.IMAGE,
      isCover: true,
    });

    if (!hasImageCover && saved.type === PropertyMediaType.IMAGE) {
      saved.isCover = true;
      await this.mediaRepository.save(saved);
    }

    return saved;
  }

  async getPresignedUrl(
    userId: string,
    mediaId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const media = await this.findOneOrThrow(userId, mediaId);
    const url = await this.storageService.getPresignedUrl(media.s3Key);
    return { url, expiresIn: 900 };
  }

  async update(
    userId: string,
    mediaId: string,
    dto: MediaUpdateDto,
  ): Promise<PropertyMedia> {
    const media = await this.findOneOrThrow(userId, mediaId);

    if (dto.displayName !== undefined) {
      media.displayName = dto.displayName;
    }

    if (dto.isCover === true) {
      if (media.type !== PropertyMediaType.IMAGE) {
        throw new BadRequestException("Apenas imagens podem ser capa.");
      }
      await this.mediaRepository.update(
        { userId, propertyId: media.propertyId, active: true },
        { isCover: false },
      );
      media.isCover = true;
    }

    return this.mediaRepository.save(media);
  }

  async findAllForPresentation(propertyId: string) {
    const media = await this.mediaRepository
      .createQueryBuilder("media")
      .addSelect("media.s3Key")
      .where("media.propertyId = :propertyId", { propertyId })
      .andWhere("media.active = :active", { active: true })
      .orderBy("media.sortOrder", "ASC")
      .addOrderBy("media.createdAt", "ASC")
      .getMany();

    return Promise.all(
      media.map(async (m) => ({
        id: m.id,
        type: m.type,
        displayName: m.displayName,
        url: await this.storageService.getPresignedUrl(m.s3Key),
        sortOrder: m.sortOrder,
        isCover: m.isCover,
      })),
    );
  }

  async reorder(
    userId: string,
    propertyId: string,
    dto: MediaReorderDto,
  ): Promise<void> {
    const existing = await this.mediaRepository.find({
      where: { userId, propertyId, active: true },
    });

    const existingIds = new Set(existing.map((m) => m.id));
    for (const id of dto.orderedIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Mídia ${id} não encontrada.`);
      }
    }

    const updates = dto.orderedIds.map((id, index) =>
      this.mediaRepository.update({ id, userId }, { sortOrder: index }),
    );
    await Promise.all(updates);
  }

  async remove(userId: string, mediaId: string): Promise<void> {
    const media = await this.findOneOrThrow(userId, mediaId);
    await this.storageService.deleteObject(media.s3Key);
    media.active = false;
    await this.mediaRepository.save(media);

    if (media.isCover) {
      const nextImage = await this.mediaRepository.findOne({
        where: {
          userId,
          propertyId: media.propertyId,
          active: true,
          type: PropertyMediaType.IMAGE,
        },
        order: { sortOrder: "ASC" },
      });
      if (nextImage) {
        nextImage.isCover = true;
        await this.mediaRepository.save(nextImage);
      }
    }
  }

  private async findOneOrThrow(
    userId: string,
    mediaId: string,
  ): Promise<PropertyMedia> {
    const media = await this.mediaRepository
      .createQueryBuilder("media")
      .addSelect("media.s3Key")
      .where("media.id = :mediaId", { mediaId })
      .andWhere("media.userId = :userId", { userId })
      .andWhere("media.active = :active", { active: true })
      .getOne();

    if (!media) {
      throw new NotFoundException("Mídia não encontrada.");
    }

    return media;
  }
}
