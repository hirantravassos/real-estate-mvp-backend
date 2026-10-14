import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccessLog } from "../access-logs/entities/access-log.entity";
import { AuditLogModule } from "../audit-logs/audit-log.module";
import { AuthModule } from "../auth/auth.module";
import { User } from "../users/entities/user.entity";
import { AdminController } from "./controllers/admin.controller";
import { AdminGuard } from "./guards/admin.guard";
import { AdminDirectoryService } from "./services/admin-directory.service";
import { AdminSessionService } from "./services/admin-session.service";

/**
 * The backoffice. Other modules with @AdminOnly() routes import this one, so
 * the AdminGuard finds its dependencies there.
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, AccessLog]),
    AuthModule,
    AuditLogModule,
  ],
  controllers: [AdminController],
  providers: [AdminSessionService, AdminGuard, AdminDirectoryService],
  exports: [AdminSessionService, AdminGuard, AuditLogModule],
})
export class AdminModule {}
