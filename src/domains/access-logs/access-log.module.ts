import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessLog } from "./entities/access-log.entity";
import { AccessLogService } from "./services/access-log.service";

@Module({
  imports: [TypeOrmModule.forFeature([AccessLog])],
  providers: [AccessLogService],
  exports: [AccessLogService],
})
export class AccessLogModule {}
