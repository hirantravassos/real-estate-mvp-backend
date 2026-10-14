import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLog } from "./entities/audit-log.entity";
import { AuditTrailInterceptor } from "./interceptors/audit-trail.interceptor";
import { AuditLogService } from "./services/audit-log.service";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditTrailInterceptor },
  ],
  exports: [AuditLogService],
})
export class AuditLogModule {}
