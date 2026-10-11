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
import { PropertyLegalProfileService } from "./services/property-legal-profile.service";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { AiModule } from "../ai/ai.module";
import { DealSigner } from "../deals/entities/deal-signer.entity";
import { PropertyContact } from "../properties/entities/property-contact.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyLegalProfile,
      PropertyDocumentLookup,
      PropertyContact,
      DealSigner,
    ]),
    InfosimplesModule,
    StorageModule,
    AiModule,
    CreditModule,
    DocumentModule,
    PropertyModule,
  ],
  controllers: [DocumentLookupController],
  providers: [DocumentLookupService, PropertyLegalProfileService],
})
export class DocumentLookupModule {}
