import { Injectable } from "@nestjs/common";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import { User } from "../../users/entities/user.entity";
import { Contact, proto, WAMessage } from "@whiskeysockets/baileys";
import { CreateWhatsappContactDto } from "../dtos/create-whatsapp-contact.dto";
import IHistorySyncMsg = proto.IHistorySyncMsg;

@Injectable()
export class WhatsappContactService {
  constructor(private readonly contactRepository: WhatsappContactRepository) {}

  async saveFromContact(user: User, contact: Partial<Contact>) {
    const whatsappId = contact?.id;
    const phoneNumber = contact?.notify;
    const name = contact?.notify;
    if (!whatsappId) return;
    return await this.save({
      user,
      whatsappId,
      name: name ?? "Desconhecido",
      phoneNumber,
    });
  }

  async updateContactFromSyncMessage(user: User, syncMessage: IHistorySyncMsg) {
    const whatsappId = syncMessage?.message?.key?.remoteJid;
    const phoneNumber =
      this.getPhoneNumberFromJid(whatsappId ?? undefined) ??
      this.getPhoneNumberFromJid(
        syncMessage?.message?.key?.remoteJid ?? undefined,
      ) ??
      // @ts-expect-error: missing type
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      this.getPhoneNumberFromJid(syncMessage?.message?.key?.remoteJidAlt);
    const name =
      syncMessage?.message?.pushName ?? syncMessage?.message?.verifiedBizName;

    if (!whatsappId) return;

    const contact = await this.contactRepository.findOneBy({
      whatsappId,
      user: { id: user.id },
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

    await this.contactRepository.save(contact);
  }

  async updateContactFromWAMessage(user: User, WAMessage: WAMessage) {
    const whatsappId = WAMessage?.key?.remoteJid;
    const phoneNumber =
      this.getPhoneNumberFromJid(whatsappId ?? undefined) ??
      this.getPhoneNumberFromJid(WAMessage?.key?.remoteJid ?? undefined) ??
      this.getPhoneNumberFromJid(WAMessage?.key?.remoteJidAlt);
    const name = WAMessage?.pushName ?? WAMessage?.verifiedBizName;

    if (!whatsappId) return;

    const contact = await this.contactRepository.findOneBy({
      whatsappId,
      user: { id: user.id },
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

    await this.contactRepository.save(contact);
  }

  private async save(dto: CreateWhatsappContactDto) {
    if (dto.whatsappId === "") return;
    if (!dto.whatsappId) return;

    return await this.contactRepository.upsert(
      {
        phoneNumber: dto.phoneNumber ?? null,
        user: dto.user,
        whatsappId: dto.whatsappId,
        name: dto.name,
      },
      ["whatsappId", "user.id"],
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
}
