import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailModule } from "../../infrastructure/mail/mail.module";
import { User } from "../users/entities/user.entity";
import { BrokerMailService } from "./services/broker-mail.service";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User]), MailModule],
  providers: [BrokerMailService],
  exports: [BrokerMailService],
})
export class NotificationModule {}
