import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import * as path from "path";
import { bucketConfig } from "../../../config/bucket.config";

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
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

export const ALLOWED_MEDIA_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const ALLOWED_MEDIA_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/mpeg",
]);

const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const PRESIGNED_DOWNLOAD_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const PRESIGNED_UPLOAD_EXPIRY_SECONDS = 60 * 60; // 60 minutes (for large video uploads)

export type DocumentOwnerDomain = "customers" | "properties" | "proposals";

export interface UploadResult {
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  s3Key: string;
}

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;

  constructor(
    @Inject(bucketConfig.KEY)
    private readonly bucketConfiguration: ConfigType<typeof bucketConfig>,
  ) {
    this.s3Client = new S3Client({
      region: "auto",
      endpoint: this.bucketConfiguration.url,
      credentials: {
        accessKeyId: this.bucketConfiguration.key,
        secretAccessKey: this.bucketConfiguration.secret,
      },
    });
  }

  async uploadDocument(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
    ownerDomain: DocumentOwnerDomain,
    ownerId: string,
  ): Promise<UploadResult> {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        "Tipo de arquivo não permitido. Tipos aceitos: PDF, imagens, Word, Excel, texto.",
      );
    }

    if (fileBuffer.length > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestException("Arquivo excede o limite máximo de 50 MB.");
    }

    const ext = path
      .extname(originalName)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");
    const s3Key = `documents/${userId}/${ownerDomain}/${ownerId}/${randomUUID()}${ext}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketConfiguration.name,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
        ServerSideEncryption: "AES256",
        Metadata: {
          "original-name": Buffer.from(originalName, "utf-8").toString(
            "base64",
          ),
          "owner-domain": ownerDomain,
          "owner-id": ownerId,
          "user-id": userId,
        },
      }),
    );

    return { s3Key, mimeType, sizeBytes: fileBuffer.length };
  }

  generateMediaS3Key(
    userId: string,
    propertyId: string,
    originalName: string,
  ): string {
    const ext = path
      .extname(originalName)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");
    return `media/${userId}/properties/${propertyId}/${randomUUID()}${ext}`;
  }

  validateMediaUpload(mimeType: string, sizeBytes: number): "image" | "video" {
    const isImage = ALLOWED_MEDIA_IMAGE_TYPES.has(mimeType);
    const isVideo = ALLOWED_MEDIA_VIDEO_TYPES.has(mimeType);

    if (!isImage && !isVideo) {
      throw new BadRequestException(
        "Tipo de arquivo não permitido. Imagens aceitas: JPEG, PNG, WEBP, GIF. Vídeos aceitos: MP4, MOV, WebM, AVI.",
      );
    }

    const maxBytes = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    if (sizeBytes > maxBytes) {
      throw new BadRequestException(
        isVideo
          ? "Vídeo excede o limite máximo de 2 GB."
          : "Imagem excede o limite máximo de 50 MB.",
      );
    }

    return isImage ? "image" : "video";
  }

  async generatePresignedUploadUrl(
    s3Key: string,
    mimeType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketConfiguration.name,
      Key: s3Key,
      ContentType: mimeType,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: PRESIGNED_UPLOAD_EXPIRY_SECONDS,
    });
  }

  async verifyObjectExists(s3Key: string): Promise<{ sizeBytes: number }> {
    try {
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketConfiguration.name,
          Key: s3Key,
        }),
      );
      return { sizeBytes: response.ContentLength ?? 0 };
    } catch {
      throw new BadRequestException(
        "Arquivo não encontrado no storage. Faça o upload antes de confirmar.",
      );
    }
  }

  async getPresignedUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketConfiguration.name,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: PRESIGNED_DOWNLOAD_EXPIRY_SECONDS,
    });
  }

  async deleteObject(s3Key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketConfiguration.name,
        Key: s3Key,
      }),
    );
  }
}
