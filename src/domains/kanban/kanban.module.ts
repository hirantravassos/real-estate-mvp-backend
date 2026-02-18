import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KanbanSection } from './entities';
import { KanbanSectionRepository } from './repositories';
import { SeedDefaultSectionsUseCase, ManageSectionsUseCase } from './use-cases';
import { KanbanSectionController } from './controllers';

@Module({
  imports: [TypeOrmModule.forFeature([KanbanSection])],
  controllers: [KanbanSectionController],
  providers: [
    KanbanSectionRepository,
    SeedDefaultSectionsUseCase,
    ManageSectionsUseCase,
  ],
  exports: [KanbanSectionRepository],
})
export class KanbanModule {}
