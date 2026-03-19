import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PropertyController } from "./controllers/property.controller";
import { PropertyService } from "./services/property.service";
import { Property } from "./entities/property.entity";
import { PropertyContact } from "./entities/property-contact.entity";
import { PropertyFile } from "./entities/property-files.entity";
import { StorageModule } from "../storage/storage.module";
import { PropertyFilePresentation } from "./entities/property-file-presentation.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      PropertyContact,
      PropertyFile,
      PropertyFilePresentation,
    ]),
    StorageModule,
  ],
  controllers: [PropertyController],
  providers: [PropertyService],
  exports: [PropertyService],
})
export class PropertyModule {}
