import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";

export class KanbanCreateDto {
  @ValidateName()
  name: string;

  @ValidateLongText({ isOptional: true })
  description: string | null;
}
