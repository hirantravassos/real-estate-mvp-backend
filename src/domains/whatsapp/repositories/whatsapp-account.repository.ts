import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { WhatsappAccount } from "../entities/whatsapp-account.entity";

@Injectable()
export class WhatsappAccountRepository extends Repository<WhatsappAccount> {
  constructor(private readonly dataSource: DataSource) {
    super(WhatsappAccount, dataSource.createEntityManager());
  }
}
