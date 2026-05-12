import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Proposal } from "./entities/proposal.entity";
import { ProposalParty } from "./entities/proposal-party.entity";
import { ProposalDocument } from "./entities/proposal-document.entity";
import { ProposalService } from "./services/proposal.service";
import { ProposalDocumentService } from "./services/proposal-document.service";
import { ProposalController } from "./controllers/proposal.controller";
import { ProposalDocumentController } from "./controllers/proposal-document.controller";
import { ProposalPublicController } from "./controllers/proposal-public.controller";
import { StorageModule } from "../../infrastructure/storage/storage.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Proposal, ProposalParty, ProposalDocument]),
    StorageModule,
  ],
  controllers: [
    ProposalPublicController,
    ProposalController,
    ProposalDocumentController,
  ],
  providers: [ProposalService, ProposalDocumentService],
  exports: [ProposalService, ProposalDocumentService],
})
export class ProposalModule {}
