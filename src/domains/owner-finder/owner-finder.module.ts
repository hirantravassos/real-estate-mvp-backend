import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AiModule } from "../ai/ai.module";
import { CreditModule } from "../credits/credit.module";
import { PropertyContact } from "../properties/entities/property-contact.entity";
import { Property } from "../properties/entities/property.entity";
import { PropertyModule } from "../properties/property.module";
import { PropertyHuntModule } from "../property-hunts/property-hunt.module";
import { OwnerFinderController } from "./controllers/owner-finder.controller";
import { OwnerFinderService } from "./services/owner-finder.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, PropertyContact]),
    AiModule,
    CreditModule,
    PropertyModule,
    PropertyHuntModule,
  ],
  controllers: [OwnerFinderController],
  providers: [OwnerFinderService],
})
export class OwnerFinderModule {}
