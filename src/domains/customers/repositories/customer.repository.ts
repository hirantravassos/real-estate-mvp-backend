import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { Customer } from "../entities/customer.entity";

@Injectable()
export class CustomerRepository extends Repository<Customer> {
  constructor(private readonly dataSource: DataSource) {
    super(Customer, dataSource.createEntityManager());
  }
}
