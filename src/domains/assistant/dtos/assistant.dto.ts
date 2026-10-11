import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export const ASSISTANT_QUESTION_MAXIMUM_LENGTH = 2000;

export class AssistantAskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(ASSISTANT_QUESTION_MAXIMUM_LENGTH)
  text: string;

  @IsOptional()
  @IsBoolean()
  fromVoice?: boolean;
}

export class AssistantHistoryDto {
  @IsOptional()
  @IsISO8601()
  before?: string;
}

export class AssistantActionConfirmDto {
  /** The message text, when the broker edited it before sending. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text?: string;
}
