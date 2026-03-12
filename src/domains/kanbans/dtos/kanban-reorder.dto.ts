import { IsArray, IsString } from "class-validator";

export class KanbanReorderDto {
  @IsArray()
  @IsString({ each: true })
  kanbanIds: string[];
}
