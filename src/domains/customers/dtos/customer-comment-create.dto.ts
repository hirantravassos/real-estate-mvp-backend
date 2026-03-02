import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";

export class CustomerCommentCreateDto {
  @ValidateLongText()
  comment: string;
}
