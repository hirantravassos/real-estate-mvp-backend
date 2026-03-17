import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PropertyController } from "./controllers/property.controller";
import { PropertyService } from "./services/property.service";
import { Property } from "./entities/property.entity";
import { PropertyContact } from "./entities/property-contact.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Property, PropertyContact])],
  controllers: [PropertyController],
  providers: [PropertyService],
  exports: [PropertyService],
})
export class PropertyModule {}
