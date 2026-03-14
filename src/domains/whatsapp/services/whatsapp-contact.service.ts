import { Injectable } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { WhatsappContactMapper } from "../mappers/whatsapp-contact.mapper";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { IsOptional, IsString } from "class-validator";

export class WhatsappContactFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search?: string;
}

@Injectable()
export class WhatsappContactService {
  constructor(
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
  ) {}

  async findAllContactsToImport(user: User, dto: WhatsappContactFilterDto) {
    const sanitizedSearch = `%${dto?.search ?? ""}%`;

    const [chats, total] = await this.whatsappChatRepository
      .createQueryBuilder("chat")
      .leftJoin(
        "customers",
        "customer",
        "customer.phone = chat.phone AND customer.userId = :userId",
        { userId: user.id },
      )
      .where("chat.userId = :userId", { userId: user.id })
      .andWhere("LENGTH(chat.phone) >= :minimumLength", { minimumLength: 10 })
      .andWhere("customer.id IS NULL")
      .andWhere("chat.ignored = false")
      .andWhere(
        new Brackets((qb) => {
          qb.where("chat.name LIKE :search", {
            search: sanitizedSearch,
          }).orWhere("chat.phone LIKE :search", { search: sanitizedSearch });
        }),
      )
      .orderBy("chat.lastSentAt", "DESC")
      .skip(dto.skip)
      .take(dto.limit)
      .getManyAndCount();

    const data = WhatsappContactMapper.toDtoList(chats);
    return PaginationMapper.toDto([data, total], dto);
  }
}
