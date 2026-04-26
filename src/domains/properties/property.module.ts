import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PropertyController } from "./controllers/property.controller";
import { PropertyService } from "./services/property.service";
import { Property } from "./entities/property.entity";
import { PropertyContact } from "./entities/property-contact.entity";
import { PropertyDocumentController } from "./controllers/property-document.controller";
import { DocumentModule } from "../documents/document.module";

@Module({
  imports: [TypeOrmModule.forFeature([Property, PropertyContact]), DocumentModule],
  controllers: [PropertyController, PropertyDocumentController],
  providers: [PropertyService],
  exports: [PropertyService],
})
export class PropertyModule {}
