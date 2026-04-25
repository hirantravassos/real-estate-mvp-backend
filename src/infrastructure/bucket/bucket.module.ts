import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BucketService } from "./services/bucket.service";

@Module({
  imports: [ConfigModule],
  providers: [BucketService],
  exports: [BucketService],
})
export class BucketModule {}
