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
        position: "ASC",
        createdAt: "ASC",
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

    if (!id) {
      const maxPosition = await this.kanbanRepository
        .createQueryBuilder("kanban")
        .select("MAX(kanban.position)", "maxPosition")
        .where("kanban.userId = :userId", { userId: user.id })
        .andWhere("kanban.active = true")
        .getRawOne();

      entity.position = (maxPosition?.maxPosition ?? -1) + 1;
    }

    return this.kanbanRepository.save(entity);
  }

  async reorder(user: User, kanbanIds: string[]) {
    const updates = kanbanIds.map((kanbanId, index) =>
      this.kanbanRepository.update(
        { id: kanbanId, user: { id: user.id } },
        { position: index },
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
