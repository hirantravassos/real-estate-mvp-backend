import { KanbanSection } from '../entities';
import {
  CreateKanbanSectionDto,
  UpdateKanbanSectionDto,
  KanbanSectionResponseDto,
} from '../dtos';

export class KanbanSectionMapper {
  static toEntity(
    userId: string,
    dto: CreateKanbanSectionDto,
    displayOrder: number,
  ): Partial<KanbanSection> {
    return {
      userId,
      name: dto.name,
      color: dto.color || '#1890ff',
      displayOrder,
    };
  }

  static updateEntity(
    section: KanbanSection,
    dto: UpdateKanbanSectionDto,
  ): KanbanSection {
    if (dto.name !== undefined) section.name = dto.name;
    if (dto.color !== undefined) section.color = dto.color;
    return section;
  }

  static toResponseDto(section: KanbanSection): KanbanSectionResponseDto {
    return {
      id: section.id,
      name: section.name,
      displayOrder: section.displayOrder,
      color: section.color,
      createdAt: section.createdAt.toISOString(),
    };
  }
}
