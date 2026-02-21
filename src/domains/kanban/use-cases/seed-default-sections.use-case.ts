import { Injectable } from '@nestjs/common';
import { KanbanSectionRepository } from '../repositories';
import { KanbanSectionResponseDto } from '../dtos';
import { KanbanSectionMapper } from '../mappers';

interface DefaultSection {
  readonly name: string;
  readonly color: string;
  readonly displayOrder: number;
}

const DEFAULT_SECTIONS: readonly DefaultSection[] = [
  { name: 'Prospecção', color: '#1890ff', displayOrder: 0 },
  { name: 'Em Andamento', color: '#faad14', displayOrder: 1 },
  { name: 'Visita Agendada', color: '#722ed1', displayOrder: 2 },
  { name: 'Perdido', color: '#ff4d4f', displayOrder: 3 },
  { name: 'Concluído', color: '#52c41a', displayOrder: 4 },
];

@Injectable()
export class SeedDefaultSectionsUseCase {
  constructor(
    private readonly kanbanSectionRepository: KanbanSectionRepository,
  ) {}

  async execute(userId: string): Promise<KanbanSectionResponseDto[]> {
    const existingCount =
      await this.kanbanSectionRepository.countByUserId(userId);

    if (existingCount > 0) {
      const existing =
        await this.kanbanSectionRepository.findAllByUserId(userId);
      return existing.map((item) => KanbanSectionMapper.toResponseDto(item));
    }

    const createdSections: KanbanSectionResponseDto[] = [];

    for (const defaultSection of DEFAULT_SECTIONS) {
      const section = await this.kanbanSectionRepository.create({
        userId,
        name: defaultSection.name,
        color: defaultSection.color,
        displayOrder: defaultSection.displayOrder,
      });
      createdSections.push(KanbanSectionMapper.toResponseDto(section));
    }

    return createdSections;
  }
}
