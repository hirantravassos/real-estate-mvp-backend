import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { KanbanSectionRepository } from '../repositories';
import {
  CreateKanbanSectionDto,
  UpdateKanbanSectionDto,
  KanbanSectionResponseDto,
} from '../dtos';
import { KanbanSection } from '../entities';
import { KanbanSectionMapper } from '../mappers';

@Injectable()
export class ManageSectionsUseCase {
  constructor(
    private readonly kanbanSectionRepository: KanbanSectionRepository,
  ) { }

  async listSections(userId: string): Promise<KanbanSectionResponseDto[]> {
    const sections = await this.kanbanSectionRepository.findAllByUserId(userId);
    return sections.map(KanbanSectionMapper.toResponseDto);
  }

  async createSection(
    userId: string,
    dto: CreateKanbanSectionDto,
  ): Promise<KanbanSectionResponseDto> {
    const currentCount =
      await this.kanbanSectionRepository.countByUserId(userId);

    const section = await this.kanbanSectionRepository.create(
      KanbanSectionMapper.toEntity(userId, dto, currentCount),
    );

    return KanbanSectionMapper.toResponseDto(section);
  }

  async updateSection(
    userId: string,
    sectionId: string,
    dto: UpdateKanbanSectionDto,
  ): Promise<KanbanSectionResponseDto> {
    const section = await this.findOwnedSection(userId, sectionId);
    const updated = KanbanSectionMapper.updateEntity(section, dto);
    const saved = await this.kanbanSectionRepository.save(updated);
    return KanbanSectionMapper.toResponseDto(saved);
  }

  async deleteSection(userId: string, sectionId: string): Promise<void> {
    const section = await this.findOwnedSection(userId, sectionId);
    await this.kanbanSectionRepository.remove(section);
  }

  async reorderSections(
    userId: string,
    sectionIds: string[],
  ): Promise<KanbanSectionResponseDto[]> {
    const allSections =
      await this.kanbanSectionRepository.findAllByUserId(userId);
    const sectionMap = new Map(
      allSections.map((section) => [section.id, section]),
    );

    const reordered: KanbanSection[] = [];
    for (let i = 0; i < sectionIds.length; i++) {
      const section = sectionMap.get(sectionIds[i]);
      if (section) {
        section.displayOrder = i;
        reordered.push(section);
      }
    }

    const saved = await this.kanbanSectionRepository.saveMany(reordered);
    return saved.map(KanbanSectionMapper.toResponseDto);
  }

  private async findOwnedSection(
    userId: string,
    sectionId: string,
  ): Promise<KanbanSection> {
    const section = await this.kanbanSectionRepository.findById(sectionId);

    if (!section) {
      throw new NotFoundException('Seção não encontrada');
    }

    if (section.userId !== userId) {
      throw new ForbiddenException('Sem permissão para acessar esta seção');
    }

    return section;
  }
}
