import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Contact } from "./entities/contact.entity";
import { ContactController } from "./controllers/contact.controller";
import { ContactService } from "./services/contact.service";
import { ContactRepository } from "./repositories/contact.repository";

@Module({
  imports: [TypeOrmModule.forFeature([Contact])],
  controllers: [ContactController],
  providers: [ContactService, ContactRepository],
  exports: [ContactService, ContactRepository],
})
export class ContactModule {}
