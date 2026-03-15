import { Injectable, NotFoundException } from "@nestjs/common";
import { KanbanCreateDto } from "../dtos/kanban-create.dto";
import { KanbanMapper } from "../mappers/kanban.mapper";
import { User } from "../../users/entities/user.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { InjectRepository } from "@nestjs/typeorm";
import { Kanban } from "../entities/kanban.entity";
import { Repository } from "typeorm";

@Injectable()
export class KanbanService {
  constructor(
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
  ) {}

  async findAll(user: User, pagination: PaginationRequestDto) {
    const data = await this.kanbanRepository.findAndCount({
      where: {
        user: { id: user.id },
        active: true,
      },
      relations: {
        customers: true,
      },
      order: {
        order: "ASC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return PaginationMapper.toDto(data, pagination);
  }

  async findOne(user: User, id: string) {
    return this.kanbanRepository
      .findOneOrFail({
        where: { id, user: { id: user.id } },
        relations: {
          customers: true,
        },
      })
      .catch(() => {
        throw new NotFoundException("Kanban not found");
      });
  }

  async save(user: User, dto: KanbanCreateDto, id?: string) {
    const entity = KanbanMapper.toEntity(dto, id);

    entity.user = user;

    if (!entity?.id) {
      entity.order =
        (await this.kanbanRepository.count({
          where: { user: { id: user.id } },
        })) + 1;
    }

    return this.kanbanRepository.save(entity);
  }

  async reorder(user: User, kanbanIds: string[]) {
    const updates = kanbanIds.map((kanbanId, index) =>
      this.kanbanRepository.update(
        { id: kanbanId, user: { id: user.id } },
        { order: index },
      ),
    );

    await Promise.all(updates);
  }

  async remove(user: User, id: string) {
    await this.kanbanRepository.update(
      { id, user: { id: user.id } },
      { active: false },
    );
  }
}
