import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { WhatsappMessage } from "../entities/whatsapp-message.entity";

@Injectable()
export class WhatsappMessageRepository extends Repository<WhatsappMessage> {
  constructor(private readonly dataSource: DataSource) {
    super(WhatsappMessage, dataSource.createEntityManager());
  }
}
