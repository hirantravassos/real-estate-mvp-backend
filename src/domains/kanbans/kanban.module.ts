import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KanbanController } from "./controllers/kanban.controller";
import { KanbanService } from "./services/kanban.service";
import { Kanban } from "./entities/kanban.entity";
import { KanbanRepository } from "./repositories/kanban.repository";
import { WhatsappModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [TypeOrmModule.forFeature([Kanban]), WhatsappModule],
  controllers: [KanbanController],
  providers: [KanbanService, KanbanRepository],
  exports: [KanbanService, KanbanRepository],
})
export class KanbanModule {}
