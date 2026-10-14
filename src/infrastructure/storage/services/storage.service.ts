import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import * as path from "path";
import { bucketConfig } from "../../../config/bucket.config";

const APPLICATION_OCTET_STREAM = "application/octet-stream";

/**
 * Types we are willing to serve inline on the bucket origin, keyed by the
 * trusted file extension. Anything else is forced to a download. HTML, SVG and
 * other active types are deliberately absent.
 */
const INLINE_SAFE_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
};

const extensionOf = (s3Key: string): string =>
  path.extname(s3Key).replace(".", "").toLowerCase();

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
const MAX_INBOX_IMAGE_SIZE_BYTES = 16 * 1024 * 1024; // 16 MB, WhatsApp limit
const MAX_INBOX_VIDEO_SIZE_BYTES = 64 * 1024 * 1024; // 64 MB
const MAX_INBOX_AUDIO_SIZE_BYTES = 16 * 1024 * 1024; // 16 MB
const MAX_INBOX_DOCUMENT_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

const PRESIGNED_DOWNLOAD_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const PRESIGNED_UPLOAD_EXPIRY_SECONDS = 60 * 60; // 60 minutes (for large video uploads)

export type InboxAttachmentKind = "image" | "video" | "audio" | "document";

export type DocumentOwnerDomain =
  | "customers"
  | "properties"
  | "deals"
  | "assistant";

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
export class StorageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;

  constructor(
    @Inject(bucketConfig.KEY)
    private readonly bucketConfiguration: ConfigType<typeof bucketConfig>,
  ) {
    this.s3Client = new S3Client({
      region: this.bucketConfiguration.region,
      endpoint: this.bucketConfiguration.url,
      forcePathStyle: this.bucketConfiguration.forcePathStyle,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: this.bucketConfiguration.key,
        secretAccessKey: this.bucketConfiguration.secret,
      },
    });
  }

  async onApplicationBootstrap() {
    await this.allowBrowserUploads();
  }

  /**
   * The app uploads photos, videos and chat files straight from the browser
   * with presigned URLs, which the bucket only accepts from allowed sites.
   */
  private async allowBrowserUploads() {
    const origins = this.bucketConfiguration.corsOrigins;
    if (!this.bucketConfiguration.name || origins.length === 0) return;

    try {
      await this.s3Client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucketConfiguration.name,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: origins,
                AllowedMethods: ["GET", "PUT", "HEAD"],
                AllowedHeaders: ["*"],
                ExposeHeaders: ["ETag"],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
      this.logger.log(`Bucket accepts uploads from ${origins.join(", ")}`);
    } catch (error) {
      this.logger.error(
        `Could not set the bucket CORS, browser uploads may fail: ${String(error)}`,
      );
    }
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

  /** Files the broker attaches in the assistant chat. */
  assistantS3KeyPrefix(userId: string) {
    return `assistant/${userId}/`;
  }

  generateAssistantS3Key(userId: string, originalName: string): string {
    const ext = path
      .extname(originalName)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");
    return `${this.assistantS3KeyPrefix(userId)}${randomUUID()}${ext}`;
  }

  inboxS3KeyPrefix(userId: string, conversationId: string) {
    return `inbox/${userId}/${conversationId}/`;
  }

  generateInboxS3Key(
    userId: string,
    conversationId: string,
    originalName: string,
  ): string {
    const ext = path
      .extname(originalName)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");
    return `${this.inboxS3KeyPrefix(userId, conversationId)}${randomUUID()}${ext}`;
  }

  /** Classifies a chat attachment and checks it fits what WhatsApp accepts. */
  validateInboxUpload(
    mimeType: string,
    sizeBytes: number,
  ): InboxAttachmentKind {
    const baseMimeType = mimeType.split(";")[0].trim().toLowerCase();
    let kind: InboxAttachmentKind = "document";
    if (ALLOWED_MEDIA_IMAGE_TYPES.has(baseMimeType)) kind = "image";
    else if (baseMimeType.startsWith("video/")) kind = "video";
    else if (baseMimeType.startsWith("audio/")) kind = "audio";

    const limits: Record<InboxAttachmentKind, [number, string]> = {
      image: [MAX_INBOX_IMAGE_SIZE_BYTES, "Imagem excede o limite de 16 MB."],
      video: [MAX_INBOX_VIDEO_SIZE_BYTES, "Vídeo excede o limite de 64 MB."],
      audio: [MAX_INBOX_AUDIO_SIZE_BYTES, "Áudio excede o limite de 16 MB."],
      document: [
        MAX_INBOX_DOCUMENT_SIZE_BYTES,
        "Arquivo excede o limite de 100 MB.",
      ],
    };
    const [maximumBytes, message] = limits[kind];
    if (sizeBytes > maximumBytes) throw new BadRequestException(message);

    return kind;
  }

  async uploadBuffer(s3Key: string, buffer: Buffer, mimeType: string) {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketConfiguration.name,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
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

  async getPresignedUrl(
    s3Key: string,
    options: { downloadFileName?: string; expiresInSeconds?: number } = {},
  ): Promise<string> {
    // The stored Content-Type comes from the sender (WhatsApp, uploads) and
    // must never be honored for an inline response, or an attacker uploads
    // text/html or image/svg+xml and runs script on the bucket origin. We pin
    // both the type and the disposition from the trusted key extension.
    const safeType = INLINE_SAFE_CONTENT_TYPES[extensionOf(s3Key)];
    const command = new GetObjectCommand({
      Bucket: this.bucketConfiguration.name,
      Key: s3Key,
      ResponseContentType: options.downloadFileName
        ? APPLICATION_OCTET_STREAM
        : (safeType ?? APPLICATION_OCTET_STREAM),
      ResponseContentDisposition: options.downloadFileName
        ? `attachment; filename*=UTF-8''${encodeURIComponent(options.downloadFileName)}`
        : safeType
          ? "inline"
          : "attachment",
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: options.expiresInSeconds ?? PRESIGNED_DOWNLOAD_EXPIRY_SECONDS,
    });
  }

  async downloadObject(s3Key: string): Promise<Buffer> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketConfiguration.name,
        Key: s3Key,
      }),
    );
    if (!response.Body) throw new Error(`Empty object ${s3Key}`);
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async deleteObject(s3Key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketConfiguration.name,
        Key: s3Key,
      }),
    );
  }

  /** Every folder that holds files of one broker, see the generators above. */
  userS3KeyPrefixes(userId: string) {
    return [
      `documents/${userId}/`,
      `media/${userId}/`,
      `assistant/${userId}/`,
      `inbox/${userId}/`,
      `profile-images/${userId}/`,
      `bug-reports/${userId}/`,
    ];
  }

  /** Deletes every object under the prefix, a thousand at a time. */
  async deletePrefix(prefix: string): Promise<number> {
    if (!prefix.endsWith("/") || prefix.split("/").length < 3) {
      throw new Error(`Refusing to delete the broad prefix ${prefix}`);
    }

    let deleted = 0;
    let continuationToken: string | undefined;
    do {
      const page = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketConfiguration.name,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      const keys = (page.Contents ?? [])
        .map((object) => object.Key)
        .filter((key): key is string => Boolean(key));
      if (keys.length > 0) {
        await this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucketConfiguration.name,
            Delete: { Objects: keys.map((key) => ({ Key: key })), Quiet: true },
          }),
        );
        deleted += keys.length;
      }
      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return deleted;
  }
}
