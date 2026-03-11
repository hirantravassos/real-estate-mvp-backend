import { Injectable } from "@nestjs/common";
import { WhatsappHostService } from "./whatsapp-host.service";
import { User } from "../../users/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappContactMapper } from "../mappers/whatsapp-contact.mapper";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";

@Injectable()
export class WhatsappContactService {
  constructor(
    private readonly whatsappHostService: WhatsappHostService,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
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
      .andWhere("customer.id IS NULL") // This finds "pending imports"
      .orderBy("chat.lastSentAt", "DESC")
      .skip(pagination.skip)
      .take(pagination.limit)
      .getManyAndCount();

    const data = WhatsappContactMapper.toDtoList(chats);
    return PaginationMapper.toDto([data, total], pagination);
  }

  async findAll(user: User) {
    // const client = await this.whatsappHostService.getClientOrThrow(user);
    // const customers = await this.customerRepository.find({
    //   where: { active: true, user: { id: user.id } },
    // });
    // const chats = await client.getChats();
    // const chatsWithContacts = [];
    //
    // for (const chat of chats) {
    //   const contact = await chat.getContact();
    //   const profile = await contact.getProfilePicUrl().catch(() => null);
    //   chatsWithContacts.push({
    //     ...chat,
    //     contact,
    //     profile,
    //   });
    // }
    //
    // return WhatsappContactMapper.toDtoList(
    //   chatsWithContacts,
    //   customers,
    // )?.filter((item) => {
    //   return !item.customer?.id;
    // });
    return [];
  }
}
