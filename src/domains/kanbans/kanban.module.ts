import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KanbanController } from "./controllers/kanban.controller";
import { KanbanService } from "./services/kanban.service";
import { Kanban } from "./entities/kanban.entity";
import { KanbanRepository } from "./repositories/kanban.repository";

@Module({
  imports: [TypeOrmModule.forFeature([Kanban])],
  controllers: [KanbanController],
  providers: [KanbanService, KanbanRepository],
  exports: [KanbanService, KanbanRepository],
})
export class KanbanModule {}
