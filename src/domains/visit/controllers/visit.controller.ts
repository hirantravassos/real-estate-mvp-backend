import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import * as SharedDecorators from '../../../shared/decorators/current-user.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { ManageVisitUseCase } from '../use-cases';
import {
  CreateVisitDto,
  UpdateVisitDto,
  VisitResponseDto,
} from '../dtos';

@Controller('visits')
export class VisitController {
  constructor(private readonly manageVisit: ManageVisitUseCase) { }

  @Get()
  async list(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ): Promise<VisitResponseDto[]> {
    if (start && end) {
      return this.manageVisit.listVisitsInRange(
        user.userId,
        new Date(start),
        new Date(end),
      );
    }
    return this.manageVisit.listVisits(user.userId);
  }

  @Get('customer/:customerId')
  async listByCustomer(
    @Param('customerId') customerId: string,
  ): Promise<VisitResponseDto[]> {
    return this.manageVisit.listVisitsByCustomer(customerId);
  }

  @Post()
  async create(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Body() dto: CreateVisitDto,
  ): Promise<VisitResponseDto> {
    return this.manageVisit.createVisit(user.userId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Param('id') visitId: string,
    @Body() dto: UpdateVisitDto,
  ): Promise<VisitResponseDto> {
    return this.manageVisit.updateVisit(user.userId, visitId, dto);
  }

  @Delete(':id')
  async cancel(
    @CurrentUser() user: SharedDecorators.AuthenticatedUser,
    @Param('id') visitId: string,
  ): Promise<void> {
    return this.manageVisit.cancelVisit(user.userId, visitId);
  }
}
