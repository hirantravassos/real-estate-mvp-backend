import { ContactRepository } from "../repositories/contact.repository";
import { User } from "../../users/entities/user.entity";
import { ContactFilterDto } from "../dtos/contact.dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async findAll(user: User, filter: ContactFilterDto) {
    return await this.contactRepository.find({
      where: {
        userId: user.id,
      },
      relations: {
        seller: {
          properties: true,
        },
        buyer: {
          preferences: true,
        },
      },
      take: filter.limit,
      skip: filter.skip,
    });
  }
}
