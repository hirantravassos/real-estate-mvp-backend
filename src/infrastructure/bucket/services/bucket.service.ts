import { Injectable } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class BucketService {
  public readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.getOrThrow<string>("BUCKET_URL");
    const accessKeyId = this.configService.getOrThrow<string>("BUCKET_KEY");
    const secretAccessKey =
      this.configService.getOrThrow<string>("BUCKET_SECRET");

    this.bucketName = this.configService.getOrThrow<string>("BUCKET_NAME");

    this.s3Client = new S3Client({
      region: "auto",
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await this.s3Client.send(uploadCommand);
    return fileName;
  }
}
