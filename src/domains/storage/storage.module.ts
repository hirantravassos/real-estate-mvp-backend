import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { S3Client } from "@aws-sdk/client-s3";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StorageFile } from "./entities/storage.entity";
import { StorageService } from "./services/storage.service";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([StorageFile])],
  providers: [
    {
      provide: "S3_CLIENT",
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return new S3Client({
          region: "auto",
          endpoint: configService.getOrThrow<string>("bucket.url"),
          credentials: {
            accessKeyId: configService.getOrThrow<string>("bucket.key"),
            secretAccessKey: configService.getOrThrow<string>("bucket.secret"),
          },
          requestHandler: new NodeHttpHandler({
            connectionTimeout: 3000,
          }),
        });
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
