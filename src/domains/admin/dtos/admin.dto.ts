import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import {
  AuditLogOutcome,
  AuditLogScope,
} from "../../audit-logs/entities/audit-log.entity";

export class AdminSessionCreateDto {
  /** A fresh Google sign in of the same account, the credential of the button. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  idToken: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  accessKey: string;
}

export class AdminUserListQueryDto extends PaginationRequestDto {
  /** Part of the name or of the email. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly search?: string;
}

export class AdminAuditLogQueryDto extends PaginationRequestDto {
  @IsOptional()
  @IsUUID()
  readonly userId?: string;

  @IsOptional()
  @IsEnum(AuditLogScope)
  readonly scope?: AuditLogScope;

  @IsOptional()
  @IsEnum(AuditLogOutcome)
  readonly outcome?: AuditLogOutcome;
}

export interface AdminSessionDto {
  sessionToken: string;
  email: string;
  expiresAt: string;
}

export interface AdminOverviewDto {
  totalUsers: number;
  deletedUsers: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
}

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  city: string | null;
  creci: string | null;
  profileImage: string | null;
  createdAt: string;
  lastAccessAt: string | null;
}

export interface AdminAuditLogDto {
  id: string;
  createdAt: string;
  scope: AuditLogScope;
  action: string;
  resourceId: string | null;
  statusCode: number | null;
  outcome: AuditLogOutcome;
  ip: string | null;
  userAgent: string | null;
  detail: string | null;
  user: { id: string; name: string; email: string } | null;
}
