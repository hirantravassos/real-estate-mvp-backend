import { Injectable } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WhatsappContactMapper } from "../mappers/whatsapp-contact.mapper";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";

@Injectable()
export class WhatsappContactService {
  constructor(
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
  ) {}

  async findAllContactsToImport(user: User, pagination: PaginationRequestDto) {
    const [chats, total] = await this.whatsappChatRepository
      .createQueryBuilder("chat")
      .leftJoin(
        "customers",
        "customer",
        "customer.phone = chat.phone AND customer.userId = :userId",
        { userId: user.id },
      )
      .where("chat.userId = :userId", { userId: user.id })
      .andWhere("customer.id IS NULL")
      .andWhere("chat.ignored = false")
      .orderBy("chat.lastSentAt", "DESC")
      .skip(pagination.skip)
      .take(pagination.limit)
      .getManyAndCount();

    const data = WhatsappContactMapper.toDtoList(chats);
    return PaginationMapper.toDto([data, total], pagination);
  }
}
