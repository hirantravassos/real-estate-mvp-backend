import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { WhatsappChat } from "../entities/whatsapp-chat.entity";

@Injectable()
export class WhatsappChatRepository extends Repository<WhatsappChat> {
  constructor(private dataSource: DataSource) {
    super(WhatsappChat, dataSource.createEntityManager());
  }
}
