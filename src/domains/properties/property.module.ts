import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PropertyController } from "./controllers/property.controller";
import { PropertyService } from "./services/property.service";
import { Property } from "./entities/property.entity";
import { PropertyContact } from "./entities/property-contact.entity";
import { PropertyDocumentController } from "./controllers/property-document.controller";
import { DocumentModule } from "../documents/document.module";
import { PropertyMedia } from "./entities/property-media.entity";
import { PropertyMediaRepository } from "./repositories/property-media.repository";
import { PropertyMediaService } from "./services/property-media.service";
import { PropertyMediaController } from "./controllers/property-media.controller";
import { StorageModule } from "../../infrastructure/storage/storage.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, PropertyContact, PropertyMedia]),
    DocumentModule,
    StorageModule,
  ],
  controllers: [
    PropertyController,
    PropertyDocumentController,
    PropertyMediaController,
  ],
  providers: [
    PropertyService,
    PropertyMediaService,
    PropertyMediaRepository,
  ],
  exports: [PropertyService],
})
export class PropertyModule {}
