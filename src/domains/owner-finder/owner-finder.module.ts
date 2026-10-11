import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiModule } from "../ai/ai.module";
import { CreditModule } from "../credits/credit.module";
import { PropertyMatch } from "../property-hunts/entities/property-match.entity";
import { PropertyContact } from "../properties/entities/property-contact.entity";
import { Property } from "../properties/entities/property.entity";
import { OwnerFinderController } from "./controllers/owner-finder.controller";
import { OwnerFinderService } from "./services/owner-finder.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, PropertyContact, PropertyMatch]),
    AiModule,
    CreditModule,
  ],
  controllers: [OwnerFinderController],
  providers: [OwnerFinderService],
})
export class OwnerFinderModule {}
