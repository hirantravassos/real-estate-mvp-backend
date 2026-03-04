import { Injectable } from "@nestjs/common";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import { User } from "../../users/entities/user.entity";

interface UpsertContactData {
  readonly whatsappId: string;
  readonly phoneNumber?: string | null;
  readonly name?: string | null;
}

@Injectable()
export class WhatsappContactService {
  constructor(private readonly contactRepository: WhatsappContactRepository) {}

  async upsertContact(user: User, data: UpsertContactData): Promise<void> {
    if (!data.whatsappId) return;

    const payload: Record<string, unknown> = {
      user,
      whatsappId: data.whatsappId,
    };

    const hasRealName = data.name !== null && data.name !== undefined;
    const hasRealPhone =
      data.phoneNumber !== null && data.phoneNumber !== undefined;

    if (hasRealName) payload.name = data.name;
    if (hasRealPhone) payload.phoneNumber = data.phoneNumber;

    const existingContact = await this.contactRepository.findOneBy({
      whatsappId: data.whatsappId,
      userId: user.id,
    });

    if (existingContact) {
      if (hasRealName) existingContact.name = data.name;
      if (hasRealPhone) existingContact.phoneNumber = data.phoneNumber;
      await this.contactRepository.save(existingContact);
      return;
    }

    await this.contactRepository.upsert(
      {
        ...payload,
        name: data.name ?? "Desconhecido",
      },
      ["whatsappId", "userId"],
    );
  }
}
