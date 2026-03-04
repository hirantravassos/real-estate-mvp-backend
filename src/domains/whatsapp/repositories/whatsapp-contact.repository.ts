import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { WhatsappContact } from "../entities/whatsapp-contact.entity";

@Injectable()
export class WhatsappContactRepository extends Repository<WhatsappContact> {
  constructor(private dataSource: DataSource) {
    super(WhatsappContact, dataSource.createEntityManager());
  }
}
