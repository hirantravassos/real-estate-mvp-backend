import { Injectable } from "@nestjs/common";
import { WhatsappHostService } from "./whatsapp-host.service";
import { User } from "../../users/entities/user.entity";
import { WhatsappChatMapper } from "../mappers/whatsapp-chat.mapper";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";

@Injectable()
export class WhatsappChatsService {
  constructor(
    private readonly whatsappHostService: WhatsappHostService,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findAllChats(user: User) {
    const client = this.whatsappHostService.getClientOrThrow(user);
    const customers = await this.customerRepository.find({
      where: { active: true, user: { id: user.id } },
    });
    const chats = await client.getChats().then((chat) => {
      return WhatsappChatMapper.toDto(chat, customers);
    });
    return chats;
  }
}
