import { IsBoolean, IsOptional } from "class-validator";

export class DailyBriefingGenerateDto {
  /** Confirms the credits of a second briefing the same day. */
  @IsOptional()
  @IsBoolean()
  paid?: boolean;
}
