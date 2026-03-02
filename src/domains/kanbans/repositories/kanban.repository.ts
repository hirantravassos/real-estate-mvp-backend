import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Kanban } from "../entities/kanban.entity";

@Injectable()
export class KanbanRepository extends Repository<Kanban> {
  constructor(private readonly dataSource: DataSource) {
    super(Kanban, dataSource.createEntityManager());
  }
}
