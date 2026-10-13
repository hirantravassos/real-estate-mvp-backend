import { Transform } from "class-transformer";
import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import { normalizePhoneNumber } from "../../../shared/decorators/validation/phone-number.decorator";
import {
  DealChecklistStatus,
  DealParty,
  DealPaymentMethod,
  DealSellerType,
  DealSignerRole,
  DealStage,
  DealStatus,
} from "../enums/deal.enum";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const trimText = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

const onlyDigits = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.replace(/\D/g, "") : value;

export class DealFilterDto {
  @IsOptional()
  @IsEnum(DealStatus)
  status?: DealStatus;
}

export class DealCreateDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string | null;

  @ValidateCurrency({ isOptional: true })
  offerAmount?: string | null;

  @ValidateCurrency({ isOptional: true })
  downPaymentAmount?: string | null;

  @IsOptional()
  @IsEnum(DealPaymentMethod)
  paymentMethod?: DealPaymentMethod | null;

  @IsOptional()
  @IsBoolean()
  usesFgts?: boolean;

  @IsOptional()
  @IsEnum(DealSellerType)
  sellerType?: DealSellerType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPercentage?: number | null;
}

export class DealUpdateDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string | null;

  @ValidateCurrency({ isOptional: true })
  offerAmount?: string | null;

  @ValidateCurrency({ isOptional: true })
  downPaymentAmount?: string | null;

  @IsOptional()
  @IsEnum(DealPaymentMethod)
  paymentMethod?: DealPaymentMethod | null;

  @IsOptional()
  @IsBoolean()
  usesFgts?: boolean;

  @IsOptional()
  @IsEnum(DealSellerType)
  sellerType?: DealSellerType;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionPercentage?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

export class DealStageDto {
  @IsEnum(DealStage)
  stage: DealStage;
}

export class DealCancelDto {
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class DealPortalDto {
  @IsBoolean()
  enabled: boolean;
}

export class DealChecklistItemCreateDto {
  @IsEnum(DealParty)
  party: DealParty;

  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  requestedFromCustomer?: boolean;

  @IsOptional()
  @IsBoolean()
  screening?: boolean;
}

export class DealChecklistItemUpdateDto {
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  requestedFromCustomer?: boolean;

  @IsOptional()
  @IsBoolean()
  screening?: boolean;
}

export class DealChecklistReviewDto {
  @IsIn([
    DealChecklistStatus.APPROVED,
    DealChecklistStatus.REJECTED,
    DealChecklistStatus.RESTRICTED,
    DealChecklistStatus.PENDING,
  ])
  status: DealChecklistStatus;

  /** Why it is asked again, or which restriction was found. */
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(500)
  rejectionReason?: string | null;
}

export class DealSignerCreateDto {
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsEnum(DealSignerRole)
  role: DealSignerRole;

  @IsOptional()
  @Transform(trimText)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizePhoneNumber(value))
  @IsString()
  @MaxLength(20)
  phone?: string | null;
}

export class DealPartnerCreateDto {
  /** The contact this partner came from, optional. */
  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizePhoneNumber(value))
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @Transform(trimText)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(20)
  creci?: string | null;

  /** Part of the commission that goes to the partner, from 0 to 100. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionShare?: number | null;

  /** Adds the partner to the contract signers. */
  @IsOptional()
  @IsBoolean()
  signsContract?: boolean;
}

export class DealPartnerUpdateDto {
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizePhoneNumber(value))
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @Transform(trimText)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MaxLength(20)
  creci?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commissionShare?: number | null;

  @IsOptional()
  @IsBoolean()
  signsContract?: boolean;
}

export class DealSignerReviewDto {
  @IsBoolean()
  approved: boolean;
}

export class DealMilestoneCreateDto {
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class DealMilestoneUpdateDto {
  @IsOptional()
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class DealMessageDto {
  @Transform(trimText)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsBoolean()
  visibleToCustomer?: boolean;
}

export class DealSignDto {
  @Transform(trimText)
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  fullName: string;

  /** CPF, only the digits. */
  @Transform(onlyDigits)
  @IsString()
  @Matches(/^\d{11}$/, { message: "CPF deve ter 11 números" })
  documentNumber: string;

  /** Fingerprint of the contract the signer read, it must still be in force. */
  @IsString()
  @Matches(SHA256_PATTERN, { message: "Versão do contrato inválida" })
  contractSha256: string;

  @IsBoolean()
  @Equals(true, { message: "É preciso aceitar o contrato para assinar" })
  accepted: boolean;
}

/** The gov.br copy also names the contract version it signed. */
export class DealGovbrCopyDto {
  @IsString()
  @Matches(SHA256_PATTERN, { message: "Versão do contrato inválida" })
  contractSha256: string;
}
