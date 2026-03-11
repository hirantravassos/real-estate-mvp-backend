import { Injectable } from "@nestjs/common";
import { WhatsappHostService } from "./whatsapp-host.service";
import { User } from "../../users/entities/user.entity";
import { WhatsappChatMapper } from "../mappers/whatsapp-chat.mapper";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";

@Injectable()
export class WhatsappChatsService {
  constructor(
    private readonly whatsappHostService: WhatsappHostService,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
  ) {}

  async findAll(user: User, pagination: PaginationRequestDto) {
    const [data, count] = await this.whatsappChatRepository.findAndCount({
      where: {
        user: { id: user.id },
      },
      order: {
        lastSentAt: pagination.sortOrder || "DESC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    const customers = await this.customerRepository.find({
      where: { active: true, user: { id: user.id } },
      relations: {
        kanban: true,
      },
    });

    const chats = WhatsappChatMapper.toDtoList(data, customers);

    return PaginationMapper.toDto([chats, count], pagination);
  }

  async findOne(user: User, chatId: string) {
    const client = this.whatsappHostService.getClientOrThrow(user);
    const chat = await client.getChatById(chatId);
    const contact = await chat.getContact();
    const messages = await chat.fetchMessages({ limit: 50 });

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
        relations: {
          kanban: true,
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
