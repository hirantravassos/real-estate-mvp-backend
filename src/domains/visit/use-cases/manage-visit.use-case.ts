import { Injectable, NotFoundException } from '@nestjs/common';
import { VisitRepository } from '../repositories';
import { CreateVisitDto, UpdateVisitDto, VisitResponseDto } from '../dtos';
import { Visit } from '../entities';
import { VisitMapper } from '../mappers';
import { RecordHistoryUseCase } from '../../customer-history/use-cases';
import { CustomerActionType } from '../../customer-history/entities';

@Injectable()
export class ManageVisitUseCase {
  constructor(
    private readonly visitRepository: VisitRepository,
    private readonly recordHistory: RecordHistoryUseCase,
  ) {}

  async listVisits(userId: string): Promise<VisitResponseDto[]> {
    const visits = await this.visitRepository.findAllByUserId(userId);
    return visits.map(VisitMapper.toResponseDto);
  }

  async listVisitsInRange(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<VisitResponseDto[]> {
    const visits = await this.visitRepository.findByUserIdInRange(
      userId,
      start,
      end,
    );
    return visits.map(VisitMapper.toResponseDto);
  }

  async listVisitsByCustomer(customerId: string): Promise<VisitResponseDto[]> {
    const visits = await this.visitRepository.findByCustomerId(customerId);
    return visits.map(VisitMapper.toResponseDto);
  }

  async createVisit(
    userId: string,
    dto: CreateVisitDto,
  ): Promise<VisitResponseDto> {
    const visit = await this.visitRepository.create(
      VisitMapper.toEntity(userId, dto),
    );

    await this.recordHistory.execute(
      visit.customerId,
      CustomerActionType.VISIT_SCHEDULED,
      `Visita agendada: ${visit.title}`,
      { visitId: visit.id },
    );

    return VisitMapper.toResponseDto(visit);
  }

  async updateVisit(
    userId: string,
    visitId: string,
    dto: UpdateVisitDto,
  ): Promise<VisitResponseDto> {
    const visit = await this.findOwnedVisit(userId, visitId);
    const updated = VisitMapper.updateEntity(visit, dto);
    const saved = await this.visitRepository.save(updated);

    if (dto.feedback !== undefined || dto.rating !== undefined) {
      await this.recordHistory.execute(
        visit.customerId,
        CustomerActionType.VISIT_FEEDBACK,
        `Feedback registrado para visita: ${visit.title}`,
        { visitId: visit.id, rating: dto.rating },
      );
    }

    return VisitMapper.toResponseDto(saved);
  }

  async cancelVisit(userId: string, visitId: string): Promise<void> {
    const visit = await this.findOwnedVisit(userId, visitId);
    await this.visitRepository.remove(visit);
  }

  private async findOwnedVisit(
    userId: string,
    visitId: string,
  ): Promise<Visit> {
    const visit = await this.visitRepository.findByIdAndUserId(visitId, userId);

    if (!visit) {
      throw new NotFoundException('Visita não encontrada');
    }

    return visit;
  }
}
