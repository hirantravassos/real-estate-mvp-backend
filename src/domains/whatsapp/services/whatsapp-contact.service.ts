import { Injectable } from "@nestjs/common";
import { WhatsappHostService } from "./whatsapp-host.service";
import { User } from "../../users/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappContactMapper } from "../mappers/whatsapp-contact.mapper";

@Injectable()
export class WhatsappContactService {
  constructor(
    private readonly whatsappHostService: WhatsappHostService,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findAll(user: User) {
    const client = this.whatsappHostService.getClientOrThrow(user);
    const customers = await this.customerRepository.find({
      where: { active: true, user: { id: user.id } },
    });
    const chats = await client.getChats();
    const chatsWithContacts = [];

    for (const chat of chats) {
      const contact = await chat.getContact();
      const profile = await contact.getProfilePicUrl().catch(() => null);
      chatsWithContacts.push({
        ...chat,
        contact,
        profile,
      });
    }

    return WhatsappContactMapper.toDtoList(
      chatsWithContacts,
      customers,
    )?.filter((item) => {
      return !item.customer?.id;
    });
  }
}
