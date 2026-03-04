import { Injectable } from "@nestjs/common";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import { User } from "../../users/entities/user.entity";
import { Contact, proto, WAMessage, WASocket } from "@whiskeysockets/baileys";
import { CreateWhatsappContactDto } from "../dtos/create-whatsapp-contact.dto";
import IHistorySyncMsg = proto.IHistorySyncMsg;

@Injectable()
export class WhatsappContactService {
  constructor(
    private readonly contactRepository: WhatsappContactRepository,
  ) { }

  async saveFromContact(user: User, contact: Partial<Contact>) {
    const whatsappId = contact?.id;
    const name = contact?.notify ?? contact?.name;
    if (!whatsappId) return;
    return await this.save({
      user,
      whatsappId,
      name: name ?? "Desconhecido",
      phoneNumber: this.getPhoneNumberFromJid(whatsappId),
    });
  }

  async updateContactFromSyncMessage(
    user: User,
    socket: WASocket,
    syncMessage: IHistorySyncMsg,
  ) {
    const whatsappId = syncMessage?.message?.key?.remoteJid;
    const phoneNumber =
      this.getPhoneNumberFromJid(whatsappId ?? undefined) ??
      this.getPhoneNumberFromJid(
        syncMessage?.message?.key?.remoteJid ?? undefined,
      ) ??
      // @ts-expect-error: missing type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.getPhoneNumberFromJid(syncMessage?.message?.key?.remoteJidAlt);
    const name = this.getCleanName(
      user,
      socket,
      syncMessage?.message?.pushName,
    );

    if (!whatsappId) return;

    const contact = await this.contactRepository.findOneBy({
      whatsappId,
      userId: user.id,
    });

    if (!contact) {
      return await this.save({
        user,
        whatsappId,
        name: name ?? "Desconhecido",
        phoneNumber,
      });
    }

    if (phoneNumber) contact.phoneNumber = phoneNumber;
    if (name) contact.name = name;

    await this.save(contact);
  }

  async updateContactFromWAMessage(
    user: User,
    socket: WASocket,
    WAMessage: WAMessage,
  ) {
    const whatsappId = WAMessage?.key?.remoteJid;
    const phoneNumber =
      this.getPhoneNumberFromJid(whatsappId ?? undefined) ??
      this.getPhoneNumberFromJid(WAMessage?.key?.remoteJid ?? undefined) ??
      this.getPhoneNumberFromJid(WAMessage?.key?.remoteJidAlt);
    const name = this.getCleanName(user, socket, WAMessage?.pushName);

    if (!whatsappId) return;

    const contact = await this.contactRepository.findOneBy({
      whatsappId,
      userId: user.id,
    });

    if (!contact) {
      return await this.save({
        user,
        whatsappId,
        name: name ?? "Desconhecido",
        phoneNumber,
      });
    }

    if (phoneNumber) contact.phoneNumber = phoneNumber;
    if (name) contact.name = name;

    await this.save(contact);
  }

  private async save(dto: CreateWhatsappContactDto) {
    if (dto.whatsappId === "") return;
    if (!dto.whatsappId) return;

    return await this.contactRepository.upsert(
      {
        ...(dto.phoneNumber ? { phoneNumber: dto.phoneNumber } : {}),
        user: dto.user,
        whatsappId: dto.whatsappId,
        name: dto.name,
      },
      ["whatsappId", "userId"],
    );
  }

  private getPhoneNumberFromJid(jid?: string): string | null {
    const idWhatsApp = "@s.whatsapp.net";
    if (jid?.includes(idWhatsApp)) {
      const newPhone = jid?.replaceAll(idWhatsApp, "")?.slice(2, 1000);
      if (newPhone?.length < 10) return null;
      return newPhone;
    }
    return null;
  }

  private getCleanName(
    user: User,
    socket: WASocket,
    possibleName?: string | null,
  ): string | null {
    return (
      possibleName?.replaceAll(socket?.authState?.creds?.me?.name ?? "", "") ??
      null
    );
  }
}
