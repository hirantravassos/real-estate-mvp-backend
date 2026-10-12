import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RealtimeModule } from "../../infrastructure/realtime/realtime.module";
import { Customer } from "../customers/entities/customer.entity";
import { Property } from "../properties/entities/property.entity";
import { PropertyModule } from "../properties/property.module";
import { DocumentModule } from "../documents/document.module";
import { Deal } from "./entities/deal.entity";
import { DealChecklistItem } from "./entities/deal-checklist-item.entity";
import { DealSigner } from "./entities/deal-signer.entity";
import { DealMilestone } from "./entities/deal-milestone.entity";
import { DealEvent } from "./entities/deal-event.entity";
import { DealPartner } from "./entities/deal-partner.entity";
import { DealController } from "./controllers/deal.controller";
import { DealPortalController } from "./controllers/deal-portal.controller";
import { DealService } from "./services/deal.service";
import { DealActivityService } from "./services/deal-activity.service";
import { DealSignatureService } from "./services/deal-signature.service";
import { DealPortalService } from "./services/deal-portal.service";
import { DealPartnerService } from "./services/deal-partner.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Deal,
      DealChecklistItem,
      DealSigner,
      DealMilestone,
      DealEvent,
      DealPartner,
      Customer,
      Property,
    ]),
    DocumentModule,
    PropertyModule,
    RealtimeModule,
  ],
  controllers: [DealController, DealPortalController],
  providers: [
    DealService,
    DealActivityService,
    DealSignatureService,
    DealPortalService,
    DealPartnerService,
  ],
  exports: [DealService],
})
export class DealModule {}
