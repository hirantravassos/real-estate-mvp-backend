import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { StorageService } from "../../../infrastructure/storage/services/storage.service";
import { User } from "../entities/user.entity";
import {
  isProfileImageKey,
  PROFILE_IMAGE_FOLDER,
  profileImageKeyOf,
} from "../helpers/profile-image.helper";
import { UserRepository } from "../repositories/user.repository";

/** Big enough for the public page, small enough for every list. */
const PROFILE_IMAGE_SIZE_PIXELS = 512;
const PROFILE_IMAGE_QUALITY = 82;
/** A phone camera picture is far over the limit only when something is off. */
const MAXIMUM_SOURCE_PIXELS = 50_000_000;
const PROFILE_IMAGE_CONTENT_TYPE = "image/webp";

/**
 * The broker's own photo, shown with the character on the public pages and
 * on the profile. The upload is decoded and redrawn by the server, so only
 * a clean square webp reaches the bucket: no EXIF (location), no active
 * content, no client declared type.
 */
@Injectable()
export class UserProfileImageService {
  private readonly logger = new Logger(UserProfileImageService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly storageService: StorageService,
  ) {}

  async replace(userId: string, source: Buffer): Promise<User> {
    const user = await this.findOwnerOrThrow(userId);
    const previousKey = user.profileImage;
    const image = await this.redraw(source);

    const s3Key = `${PROFILE_IMAGE_FOLDER}/${user.id}/${randomUUID()}.webp`;
    await this.storageService.uploadBuffer(
      s3Key,
      image,
      PROFILE_IMAGE_CONTENT_TYPE,
    );
    await this.userRepository.update({ id: user.id }, { profileImage: s3Key });
    await this.deleteQuietly(previousKey);

    return this.findOwnerOrThrow(user.id);
  }

  async remove(userId: string): Promise<User> {
    const user = await this.findOwnerOrThrow(userId);
    const previousKey = user.profileImage;
    if (previousKey) {
      await this.userRepository.update({ id: user.id }, { profileImage: null });
      await this.deleteQuietly(previousKey);
    }
    return this.findOwnerOrThrow(user.id);
  }

  /**
   * Public: the photo is shown to anyone with the broker's links. Only the
   * photo the broker currently uses is served, never another bucket object.
   */
  async read(userId: string, fileName: string): Promise<Buffer> {
    const s3Key = profileImageKeyOf(userId, fileName);
    if (!isProfileImageKey(s3Key)) throw new NotFoundException();

    const user = await this.userRepository.findOneBy({
      id: userId.toLowerCase(),
      active: true,
    });
    if (!user || user.profileImage !== s3Key) throw new NotFoundException();

    return this.storageService.downloadObject(s3Key).catch(() => {
      throw new NotFoundException();
    });
  }

  private async findOwnerOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    return user;
  }

  private async redraw(source: Buffer): Promise<Buffer> {
    try {
      return await sharp(source, {
        limitInputPixels: MAXIMUM_SOURCE_PIXELS,
        failOn: "error",
      })
        // Applies the camera orientation before the EXIF is dropped.
        .rotate()
        .resize(PROFILE_IMAGE_SIZE_PIXELS, PROFILE_IMAGE_SIZE_PIXELS, {
          fit: "cover",
          position: "attention",
        })
        .webp({ quality: PROFILE_IMAGE_QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        "Não conseguimos ler esta imagem. Envie uma foto JPEG, PNG ou WEBP.",
      );
    }
  }

  private async deleteQuietly(s3Key: string | null) {
    if (!s3Key || !isProfileImageKey(s3Key)) return;
    await this.storageService.deleteObject(s3Key).catch((error: unknown) => {
      this.logger.warn(
        `Could not delete the old photo ${s3Key}: ${String(error)}`,
      );
    });
  }
}
