import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, LessThan, Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { AssistantChatListDto } from "../dtos/assistant.dto";
import { AssistantAction } from "../entities/assistant-action.entity";
import { AssistantChat } from "../entities/assistant-chat.entity";
import { AssistantMessage } from "../entities/assistant-message.entity";
import { AssistantActionStatus } from "../enums/assistant.enum";
import { AssistantMapper } from "../mappers/assistant.mapper";

const CHATS_PAGE = 30;
const TITLE_LENGTH = 60;

/** A short title from the first question, cut at a word. */
export const titleFrom = (question: string) => {
  const clean = question.replace(/\s+/g, " ").trim();
  if (clean.length <= TITLE_LENGTH) return clean || "Nova conversa";
  const cut = clean.substring(0, TITLE_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.substring(0, lastSpace > 30 ? lastSpace : TITLE_LENGTH)}…`;
};

/** The broker's separate conversations with the assistant. */
@Injectable()
export class AssistantChatService {
  constructor(
    @InjectRepository(AssistantChat)
    private readonly chatRepository: Repository<AssistantChat>,
    @InjectRepository(AssistantMessage)
    private readonly messageRepository: Repository<AssistantMessage>,
    @InjectRepository(AssistantAction)
    private readonly actionRepository: Repository<AssistantAction>,
  ) {}

  async list(user: User, dto: AssistantChatListDto) {
    if (!dto.before) await this.adoptLooseMessages(user);

    const chats = await this.chatRepository.find({
      where: {
        userId: user.id,
        active: true,
        ...(dto.before
          ? { lastMessageAt: LessThan(new Date(dto.before)) }
          : {}),
      },
      order: { lastMessageAt: "DESC" },
      take: CHATS_PAGE + 1,
    });
    return {
      data: chats
        .slice(0, CHATS_PAGE)
        .map((chat) => AssistantMapper.toChatDto(chat)),
      hasMore: chats.length > CHATS_PAGE,
    };
  }

  async findOwned(user: User, chatId: string) {
    const chat = await this.chatRepository.findOneBy({
      id: chatId,
      userId: user.id,
      active: true,
    });
    if (!chat) throw new NotFoundException("Conversa não encontrada.");
    return chat;
  }

  /** A new chat, named after the question that opened it. */
  start(user: User, question: string, at: Date) {
    return this.chatRepository.save(
      this.chatRepository.create({
        userId: user.id,
        title: titleFrom(question),
        lastMessageAt: at,
      }),
    );
  }

  async touch(chat: AssistantChat, at: Date) {
    chat.lastMessageAt = at;
    await this.chatRepository.update(chat.id, { lastMessageAt: at });
  }

  async rename(user: User, chatId: string, title: string) {
    const chat = await this.findOwned(user, chatId);
    chat.title = title.trim().substring(0, 120);
    await this.chatRepository.update(chat.id, { title: chat.title });
    return AssistantMapper.toChatDto(chat);
  }

  /** Hides the chat and drops what was still waiting for confirmation. */
  async remove(user: User, chatId: string) {
    const chat = await this.findOwned(user, chatId);
    const messages = await this.messageRepository.find({
      select: { id: true },
      where: { chatId: chat.id, userId: user.id },
    });
    if (messages.length) {
      await this.actionRepository.update(
        {
          userId: user.id,
          status: AssistantActionStatus.PENDING,
          messageId: In(messages.map((message) => message.id)),
        },
        { status: AssistantActionStatus.CANCELLED },
      );
    }
    await this.messageRepository.update(
      { chatId: chat.id, userId: user.id },
      { active: false },
    );
    await this.chatRepository.update(chat.id, { active: false });
  }

  /** Lines from before chats existed become one chat, so nothing is lost. */
  private async adoptLooseMessages(user: User) {
    const loose = await this.messageRepository.find({
      where: { userId: user.id, active: true, chatId: IsNull() },
      order: { sentAt: "ASC" },
    });
    if (!loose.length) return;

    const chat = await this.chatRepository.save(
      this.chatRepository.create({
        userId: user.id,
        title: "Conversa anterior",
        lastMessageAt: loose[loose.length - 1].sentAt,
      }),
    );
    await this.messageRepository.update(
      { id: In(loose.map((message) => message.id)), userId: user.id },
      { chatId: chat.id },
    );
  }
}
