import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { WhatsappChatRepository } from "../repositories/whatsapp-chat.repository";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { WhatsappMessage } from "../entities/whatsapp-message.entity";

export interface NotificationItemDto {
    chatId: string;
    whatsappId: string;
    customerName: string | null;
    customerPhone: string;
    lastMessageContent: string;
    lastMessageSentAt: string;
    lastMessageType: string;
    unread: boolean;
}

export interface NotificationCountDto {
    count: number;
}

@Injectable()
export class NotificationService {
    constructor(
        @Inject(forwardRef(() => WhatsappChatRepository))
        private readonly chatRepository: WhatsappChatRepository,
    ) { }

    async findUnreadNotifications(user: User): Promise<NotificationItemDto[]> {
        const chats = await this.chatRepository
            .createQueryBuilder("chat")
            .innerJoinAndMapOne(
                "chat.customer",
                Customer,
                "customer",
                "customer.phone = chat.phone AND customer.userId = chat.userId",
            )
            .where("chat.userId = :userId", { userId: user.id })
            .andWhere("chat.unread = :unread", { unread: true })
            .andWhere("customer.ignored = :ignored", { ignored: false })
            .andWhere("customer.active = :active", { active: true })
            .orderBy("chat.lastSentAt", "DESC")
            .getMany();

        const notificationItems: NotificationItemDto[] = [];

        for (const chat of chats) {
            const customer = (chat as unknown as { customer: Customer }).customer;

            const latestMessage = await this.chatRepository.manager
                .getRepository(WhatsappMessage)
                .findOne({
                    where: {
                        whatsappId: chat.whatsappId,
                        userId: user.id,
                    },
                    order: { sentAt: "DESC" },
                });

            notificationItems.push({
                chatId: chat.id,
                whatsappId: chat.whatsappId,
                customerName: customer?.name ?? null,
                customerPhone: chat.phone,
                lastMessageContent: latestMessage?.content ?? "",
                lastMessageSentAt: latestMessage?.sentAt ?? chat.lastSentAt ?? "",
                lastMessageType: latestMessage?.type ?? "text",
                unread: chat.unread,
            });
        }

        return notificationItems;
    }

    async countUnreadNotifications(user: User): Promise<NotificationCountDto> {
        const count = await this.chatRepository
            .createQueryBuilder("chat")
            .innerJoin(
                Customer,
                "customer",
                "customer.phone = chat.phone AND customer.userId = chat.userId",
            )
            .where("chat.userId = :userId", { userId: user.id })
            .andWhere("chat.unread = :unread", { unread: true })
            .andWhere("customer.ignored = :ignored", { ignored: false })
            .andWhere("customer.active = :active", { active: true })
            .getCount();

        return { count };
    }
}
