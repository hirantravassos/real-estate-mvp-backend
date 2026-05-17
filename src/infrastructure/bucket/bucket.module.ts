import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BucketService } from "./services/bucket.service";
import Joi from "joi";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        BUCKET_KEY: Joi.string(),
        BUCKET_NAME: Joi.string(),
        BUCKET_SECRET: Joi.string(),
        BUCKET_URL: Joi.string().uri(),
      }),
    }),
  ],
  providers: [BucketService],
  exports: [BucketService],
})
export class BucketModule {}
