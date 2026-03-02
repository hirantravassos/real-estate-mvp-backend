import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { CustomerComment } from "../entities/customer-comments.entity";

@Injectable()
export class CustomerCommentRepository extends Repository<CustomerComment> {
  constructor(private readonly dataSource: DataSource) {
    super(CustomerComment, dataSource.createEntityManager());
  }
}
