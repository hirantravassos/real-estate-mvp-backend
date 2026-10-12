import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import {
  APPLICABLE_ACTIONS,
  type ApplicableAction,
} from "../helpers/reclassification-rule.helper";

/** Customers the AI reads in one call, the screen sends them in batches. */
export const RECLASSIFICATION_BATCH_SIZE = 8;

/** Decisions applied in one call, the screen sends them in batches. */
export const RECLASSIFICATION_APPLY_BATCH_SIZE = 100;

export class ReclassificationAnalysisDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(RECLASSIFICATION_BATCH_SIZE)
  @IsUUID("all", { each: true })
  customerIds: string[];
}

export class ReclassificationDecisionDto {
  @IsUUID()
  customerId: string;

  @IsIn(APPLICABLE_ACTIONS)
  action: ApplicableAction;

  /** The new funnel stage, required when moving. */
  @ValidateIf(
    (decision: ReclassificationDecisionDto) => decision.action === "move",
  )
  @IsUUID()
  kanbanId?: string | null;

  /** Why, saved on the customer's history. */
  @IsOptional()
  @IsString()
  @MaxLength(600)
  reason?: string | null;

  /** Where the negotiation stands, saved with the reason. */
  @IsOptional()
  @IsString()
  @MaxLength(600)
  summary?: string | null;
}

export class ReclassificationApplyDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(RECLASSIFICATION_APPLY_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => ReclassificationDecisionDto)
  decisions: ReclassificationDecisionDto[];
}
