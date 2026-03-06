import { Injectable } from "@nestjs/common";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import { CustomerRepository } from "../../customers/repositories/customer.repository";
import { User } from "../../users/entities/user.entity";

interface UpsertContactData {
  readonly whatsappId: string;
  readonly phoneNumber?: string | null;
  readonly name?: string | null;
}

@Injectable()
export class WhatsappContactService {
  constructor(
    private readonly contactRepository: WhatsappContactRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async findOne(user: User, whatsappId: string) {
    return this.contactRepository.findOne({
      where: { whatsappId, userId: user.id },
    });
  }

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
    } else {
      await this.contactRepository.upsert(payload, ["whatsappId", "userId"]);
    }

    if (hasRealPhone) {
      void this.ensurePendingCustomerExists(user, data.phoneNumber, data.name);
    }
  }

  private async ensurePendingCustomerExists(
    user: User,
    phone: string,
    name?: string | null,
  ): Promise<void> {
    const existingCustomer = await this.customerRepository.findOneBy({
      userId: user.id,
      phone,
    });

    if (existingCustomer) return;

    await this.customerRepository
      .save({
        user,
        name: name ?? null,
        phone,
        pending: true,
        ignored: false,
      })
      .catch((error) => {
        console.warn(
          "Customer auto-create skipped (likely duplicate):",
          error?.message,
        );
      });
  }
}
