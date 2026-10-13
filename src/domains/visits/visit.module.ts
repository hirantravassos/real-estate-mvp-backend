import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Visit } from "./entities/visit.entity";
import { Customer } from "../customers/entities/customer.entity";
import { Property } from "../properties/entities/property.entity";
import { VisitController } from "./controllers/visit.controller";
import { VisitService } from "./services/visit.service";

@Module({
  imports: [TypeOrmModule.forFeature([Visit, Customer, Property])],
  controllers: [VisitController],
  providers: [VisitService],
  exports: [VisitService],
})
export class VisitModule {}
