import { Injectable } from "@nestjs/common";
import { WhatsappContactRepository } from "../repositories/whatsapp-contact.repository";
import { CustomerRepository } from "../../customers/repositories/customer.repository";
import { User } from "../../users/entities/user.entity";

export class WhatsappContactCreateDto {
  phoneNumber?: string | null;
  name?: string | null;
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

  async save(
    user: User,
    whatsappId: string,
    dto: Partial<WhatsappContactCreateDto>,
  ): Promise<void> {
    const dataToSave = {
      whatsappId,
      userId: user.id,
      ...(dto.name && { name: dto.name }),
      ...(dto.phoneNumber && { phoneNumber: dto.phoneNumber }),
    };

    await this.contactRepository.upsert(dataToSave, ["userId", "whatsappId"]);

    if (dto.phoneNumber) {
      await this.ensurePendingCustomerExists(user, dto.phoneNumber, dto.name);
    }
  }

  async updateNameByPhoneNumber(
    user: User,
    phoneNumber: string,
    name: string | null,
  ) {
    if (!name) return;
    if (!phoneNumber) return;

    await this.customerRepository.upsert(
      {
        user,
        phone: phoneNumber,
        name,
      },
      ["user", "phone"],
    );

    await this.contactRepository.update(
      { phoneNumber, userId: user.id },
      { name },
    );
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
        console.warn("Customer auto-create skipped (likely duplicate):", error);
      });
  }
}
