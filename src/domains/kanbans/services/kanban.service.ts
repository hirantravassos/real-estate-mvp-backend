import { Injectable, NotFoundException } from "@nestjs/common";
import { KanbanRepository } from "../repositories/kanban.repository";
import { KanbanCreateDto } from "../dtos/kanban-create.dto";
import { KanbanMapper } from "../mappers/kanban.mapper";
import { User } from "../../users/entities/user.entity";
import { PaginationQueryDto } from "../../../shared/types/pagination-query.dto";
import { Kanban } from "../entities/kanban.entity";
import { PaginatedResult } from "../../../shared/types/api-response.types";

@Injectable()
export class KanbanService {
  constructor(private readonly kanbanRepository: KanbanRepository) {}

  async findAll(
    user: User,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<Kanban>> {
    const [items, total] = await this.kanbanRepository.findAndCount({
      where: {
        user: { id: user.id },
        active: true,
      },
      relations: {
        customers: true,
      },
      order: {
        [pagination.sortBy || "createdAt"]: pagination.sortOrder || "DESC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return {
      data: items,
      total: total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findOne(user: User, id: string) {
    return this.kanbanRepository
      .findOneByOrFail({ id, user: { id: user.id } })
      .catch(() => {
        throw new NotFoundException("Kanban not found");
      });
  }

  async save(user: User, dto: KanbanCreateDto, id?: string) {
    const entity = KanbanMapper.toEntity(dto, id);
    entity.user = user;
    return this.kanbanRepository.save(entity);
  }

  async remove(user: User, id: string) {
    await this.kanbanRepository.update(
      { id, user: { id: user.id } },
      { active: false },
    );
  }
}
