import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { WhatsappSession } from "../entities/whatsapp-session.entity";

@Injectable()
export class WhatsappSessionRepository extends Repository<WhatsappSession> {
  constructor(private readonly dataSource: DataSource) {
    super(WhatsappSession, dataSource.createEntityManager());
  }
}
