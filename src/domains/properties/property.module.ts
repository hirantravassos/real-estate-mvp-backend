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
import { PropertyPresentationController } from "./controllers/property-presentation.controller";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { CustomerModule } from "../customers/customer.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, PropertyContact, PropertyMedia]),
    DocumentModule,
    StorageModule,
    CustomerModule,
  ],
  controllers: [
    PropertyController,
    PropertyDocumentController,
    PropertyMediaController,
    PropertyPresentationController,
  ],
  providers: [PropertyService, PropertyMediaService, PropertyMediaRepository],
  exports: [PropertyService, PropertyMediaService],
})
export class PropertyModule {}
