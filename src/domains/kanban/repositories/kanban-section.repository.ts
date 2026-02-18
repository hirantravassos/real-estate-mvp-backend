import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KanbanSection } from '../entities/kanban-section.entity';

@Injectable()
export class KanbanSectionRepository {
  constructor(
    @InjectRepository(KanbanSection)
    private readonly repository: Repository<KanbanSection>,
  ) {}

  async findAllByUserId(userId: string): Promise<KanbanSection[]> {
    return this.repository.find({
      where: { userId },
      order: { displayOrder: 'ASC' },
    });
  }

  async findById(id: string): Promise<KanbanSection | null> {
    return this.repository.findOne({ where: { id } });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.repository.count({ where: { userId } });
  }

  async create(partial: Partial<KanbanSection>): Promise<KanbanSection> {
    const section = this.repository.create(partial);
    return this.repository.save(section);
  }

  async save(section: KanbanSection): Promise<KanbanSection> {
    return this.repository.save(section);
  }

  async saveMany(sections: KanbanSection[]): Promise<KanbanSection[]> {
    return this.repository.save(sections);
  }

  async remove(section: KanbanSection): Promise<void> {
    await this.repository.remove(section);
  }
}
