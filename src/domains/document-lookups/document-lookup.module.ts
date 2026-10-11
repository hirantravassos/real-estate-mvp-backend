import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InfosimplesModule } from "../../infrastructure/infosimples/infosimples.module";
import { CreditModule } from "../credits/credit.module";
import { DocumentModule } from "../documents/document.module";
import { PropertyModule } from "../properties/property.module";
import { DocumentLookupController } from "./controllers/document-lookup.controller";
import { PropertyDocumentLookup } from "./entities/property-document-lookup.entity";
import { PropertyLegalProfile } from "./entities/property-legal-profile.entity";
import { DocumentLookupService } from "./services/document-lookup.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([PropertyLegalProfile, PropertyDocumentLookup]),
    InfosimplesModule,
    CreditModule,
    DocumentModule,
    PropertyModule,
  ],
  controllers: [DocumentLookupController],
  providers: [DocumentLookupService],
  exports: [DocumentLookupService],
})
export class DocumentLookupModule {}
