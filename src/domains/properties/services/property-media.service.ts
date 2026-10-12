import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  PropertyMedia,
  PropertyMediaType,
} from "../entities/property-media.entity";
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

    return this.register(userId, propertyId, {
      type:
        mediaType === "image"
          ? PropertyMediaType.IMAGE
          : PropertyMediaType.VIDEO,
      displayName: dto.displayName,
      s3Key: dto.s3Key,
      mimeType: dto.mimeType,
      sizeBytes: actualSize,
    });
  }

  /** Puts a file the server already holds, like a chat photo, in the gallery. */
  async addFromBuffer(
    userId: string,
    propertyId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<PropertyMedia> {
    const mediaType = this.storageService.validateMediaUpload(
      file.mimeType,
      file.buffer.length,
    );
    const s3Key = this.storageService.generateMediaS3Key(
      userId,
      propertyId,
      file.fileName,
    );
    await this.storageService.uploadBuffer(s3Key, file.buffer, file.mimeType);

    return this.register(userId, propertyId, {
      type:
        mediaType === "image"
          ? PropertyMediaType.IMAGE
          : PropertyMediaType.VIDEO,
      displayName: file.fileName,
      s3Key,
      mimeType: file.mimeType,
      sizeBytes: file.buffer.length,
    });
  }

  /** Appends the media at the end of the gallery, the first photo becomes the cover. */
  private async register(
    userId: string,
    propertyId: string,
    file: {
      type: PropertyMediaType;
      displayName: string;
      s3Key: string;
      mimeType: string;
      sizeBytes: number;
    },
  ): Promise<PropertyMedia> {
    const maxOrder = await this.mediaRepository.maximum("sortOrder", {
      userId,
      propertyId,
      active: true,
    });

    const media = new PropertyMedia();
    media.userId = userId;
    media.propertyId = propertyId;
    media.type = file.type;
    media.displayName = file.displayName.substring(0, 255);
    media.s3Key = file.s3Key;
    media.mimeType = file.mimeType;
    media.sizeBytes = file.sizeBytes;
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

    if (dto.visibleToCustomer !== undefined) {
      media.visibleToCustomer = dto.visibleToCustomer;
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
      .andWhere("media.visibleToCustomer = :visible", { visible: true })
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

  /** One picture per property, the cover or else the first, for listings. */
  async findCoversForPresentation(
    propertyIds: string[],
  ): Promise<Map<string, string>> {
    if (!propertyIds.length) return new Map();

    const images = await this.mediaRepository
      .createQueryBuilder("media")
      .addSelect("media.s3Key")
      .where("media.propertyId IN (:...propertyIds)", { propertyIds })
      .andWhere("media.active = :active", { active: true })
      .andWhere("media.type = :type", { type: PropertyMediaType.IMAGE })
      .andWhere("media.visibleToCustomer = :visible", { visible: true })
      .orderBy("media.isCover", "DESC")
      .addOrderBy("media.sortOrder", "ASC")
      .addOrderBy("media.createdAt", "ASC")
      .getMany();

    const keys = new Map<string, string>();
    for (const image of images) {
      if (!keys.has(image.propertyId)) keys.set(image.propertyId, image.s3Key);
    }

    const covers = new Map<string, string>();
    await Promise.all(
      [...keys].map(async ([propertyId, s3Key]) => {
        covers.set(
          propertyId,
          await this.storageService.getPresignedUrl(s3Key),
        );
      }),
    );
    return covers;
  }

  /** Media a customer may see, with the storage keys, to send through WhatsApp. */
  async findForMessaging(userId: string, propertyId: string) {
    return this.mediaRepository
      .createQueryBuilder("media")
      .addSelect("media.s3Key")
      .where("media.propertyId = :propertyId", { propertyId })
      .andWhere("media.userId = :userId", { userId })
      .andWhere("media.active = :active", { active: true })
      .andWhere("media.visibleToCustomer = :visible", { visible: true })
      .orderBy("media.sortOrder", "ASC")
      .addOrderBy("media.createdAt", "ASC")
      .getMany();
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
