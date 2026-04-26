import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class MediaPresignedUploadRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MinLength(1)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(2 * 1024 * 1024 * 1024) // 2 GB
  @Type(() => Number)
  sizeBytes: number;
}

export class MediaConfirmUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  s3Key: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName: string;

  @IsString()
  @MinLength(1)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  sizeBytes: number;
}

export class MediaRenameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName: string;
}

export class MediaSetCoverDto {
  @IsBoolean()
  isCover: boolean;
}

export class MediaReorderDto {
  @IsArray()
  @IsUUID("4", { each: true })
  orderedIds: string[];
}

export class MediaUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isCover?: boolean;
}
