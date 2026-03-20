import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { StorageFile } from "../entities/storage.entity";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

export interface StorageFileResponse {
  id: string;
  url: string;
  mimetype: string;
  name: string;
  sizeBytes: number;
}

@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(StorageFile)
    private readonly storageFileRepository: Repository<StorageFile>,
    @Inject("S3_CLIENT")
    private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
  ) {}

  private get bucketName(): string {
    return this.configService.getOrThrow<string>("bucket.name");
  }

  async uploadFile(
    user: User,
    folder: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const fileId = randomUUID();
    const objectKey = `${folder}/${fileId}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    await this.storageFileRepository.save({
      id: fileId,
      user,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      objectKey,
    });

    return fileId;
  }

  async getFile(user: User, fileId: string): Promise<StorageFileResponse> {
    const storageFile = await this.storageFileRepository
      .findOneOrFail({
        where: { id: fileId, user: { id: user.id } },
      })
      .catch(() => {
        throw new NotFoundException("File not found");
      });

    const url = await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: storageFile.key,
      }),
      { expiresIn: 3600 },
    );

    const name =
      storageFile?.key?.split("/")?.pop()?.slice(14, 0) ?? "Sem nome";

    return {
      url,
      mimetype: storageFile.mimetype,
      id: storageFile.id,
      name,
      sizeBytes: storageFile?.fileSize,
    };
  }

  async deleteFile(user: User, fileId: string): Promise<void> {
    const storageFile = await this.storageFileRepository
      .findOneOrFail({
        where: { id: fileId, user: { id: user.id } },
      })
      .catch(() => {
        throw new NotFoundException("File not found");
      });

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storageFile.key,
      }),
    );

    await this.storageFileRepository.delete({ id: fileId });
  }
}
