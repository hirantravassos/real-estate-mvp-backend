import { Injectable, NotFoundException } from "@nestjs/common";
import { KanbanRepository } from "../repositories/kanban.repository";
import { KanbanCreateDto } from "../dtos/kanban-create.dto";
import { KanbanMapper } from "../mappers/kanban.mapper";
import { User } from "../../users/entities/user.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { WhatsappChatRepository } from "../../whatsapp/repositories/whatsapp-chat.repository";
import { In } from "typeorm";

@Injectable()
export class KanbanService {
  constructor(
    private readonly kanbanRepository: KanbanRepository,
    private readonly whatsappChatRepository: WhatsappChatRepository,
  ) { }

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

    const [kanbans] = response;

    const allPhones = kanbans
      .flatMap((kanban) => kanban.customers ?? [])
      .map((customer) => customer.phone)
      .filter(Boolean);

    const unreadChatPhones = new Set<string>();

    if (allPhones.length > 0) {
      const unreadChats = await this.whatsappChatRepository.find({
        where: {
          userId: user.id,
          phone: In(allPhones),
          unread: true,
        },
        select: ["phone"],
      });

      for (const chat of unreadChats) {
        unreadChatPhones.add(chat.phone);
      }
    }

    return {
      pagination: PaginationMapper.toDto(response, pagination),
      unreadChatPhones,
    };
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
    return this.kanbanRepository.save(entity);
  }

  async remove(user: User, id: string) {
    await this.kanbanRepository.update(
      { id, user: { id: user.id } },
      { active: false },
    );
  }
}
