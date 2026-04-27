import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Document } from "./entities/document.entity";
import { DocumentRepository } from "./repositories/document.repository";
import { DocumentService } from "./services/document.service";
import { StorageModule } from "../../infrastructure/storage/storage.module";

@Module({
  imports: [TypeOrmModule.forFeature([Document]), StorageModule],
  providers: [DocumentService, DocumentRepository],
  exports: [DocumentService],
})
export class DocumentModule {}
