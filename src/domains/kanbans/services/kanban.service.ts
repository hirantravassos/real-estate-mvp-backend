import { Injectable, NotFoundException } from "@nestjs/common";
import { KanbanRepository } from "../repositories/kanban.repository";
import { KanbanCreateDto } from "../dtos/kanban-create.dto";
import { KanbanMapper } from "../mappers/kanban.mapper";
import { User } from "../../users/entities/user.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";

@Injectable()
export class KanbanService {
  constructor(private readonly kanbanRepository: KanbanRepository) {}

  async findAll(user: User, pagination: PaginationRequestDto) {
    const response = await this.kanbanRepository.findAndCount({
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

    return PaginationMapper.toDto(response, pagination);
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
