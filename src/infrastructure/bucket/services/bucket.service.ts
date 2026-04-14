import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { bucketConfig } from "../../../config/bucket.config";

@Injectable()
export class BucketService {
  public readonly s3Client: S3Client;

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

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<string> {
    const uploadCommand = new PutObjectCommand({
      Bucket: this.bucketConfiguration.name,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await this.s3Client.send(uploadCommand);
    return fileName;
  }
}
