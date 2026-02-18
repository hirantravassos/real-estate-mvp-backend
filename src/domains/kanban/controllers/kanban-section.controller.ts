import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Put,
} from '@nestjs/common';
import * as SharedDecorators from '../../../shared/decorators/current-user.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import {
  SeedDefaultSectionsUseCase,
  ManageSectionsUseCase,
} from '../use-cases';
import {
  CreateKanbanSectionDto,
  UpdateKanbanSectionDto,
  ReorderSectionsDto,
  KanbanSectionResponseDto,
} from '../dtos';

@Controller('kanban-sections')
export class KanbanSectionController {
  constructor(
    private readonly seedDefaultSections: SeedDefaultSectionsUseCase,
    private readonly manageSections: ManageSectionsUseCase,
  ) { }

  @Get()
  async list(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
  ): Promise<KanbanSectionResponseDto[]> {
    const sections = await this.manageSections.listSections(user.userId);

    if (sections.length === 0) {
      return this.seedDefaultSections.execute(user.userId);
    }

    return sections;
  }

  @Post()
  async create(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Body() dto: CreateKanbanSectionDto,
  ): Promise<KanbanSectionResponseDto> {
    return this.manageSections.createSection(user.userId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Param('id') sectionId: string,
    @Body() dto: UpdateKanbanSectionDto,
  ): Promise<KanbanSectionResponseDto> {
    return this.manageSections.updateSection(user.userId, sectionId, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Param('id') sectionId: string,
  ): Promise<void> {
    return this.manageSections.deleteSection(user.userId, sectionId);
  }

  @Put('reorder')
  async reorder(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Body() dto: ReorderSectionsDto,
  ): Promise<KanbanSectionResponseDto[]> {
    return this.manageSections.reorderSections(user.userId, dto.sectionIds);
  }
}
