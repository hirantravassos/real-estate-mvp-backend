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

    return WhatsappChatMapper.toDtoList(chatsWithContacts, customers);
  }

  async findOne(user: User, chatId: string) {
    const client = this.whatsappHostService.getClientOrThrow(user);
    const chat = await client.getChatById(chatId);
    const contact = await chat.getContact();
    const messages = await chat.fetchMessages({ limit: 100 });

    const messageWithMedia = [];

    for (const message of messages) {
      if (message.hasMedia) {
        const media = await message.downloadMedia();
        messageWithMedia.push({
          ...message,
          media,
        });
      } else {
        messageWithMedia.push({
          ...message,
          media: null,
        });
      }
    }

    const customer =
      (await this.customerRepository.findOne({
        where: {
          active: true,
          user: { id: user.id },
          phone: contact.number.slice(2),
        },
      })) ?? undefined;
    const profile = await contact.getProfilePicUrl().catch(() => null);

    void client.sendSeen(chat.id._serialized);

    return WhatsappChatMapper.toDto(
      {
        ...chat,
        contact,
        profile,
      },
      messageWithMedia,
      customer,
    );
  }
}
