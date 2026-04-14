import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CustomerController } from "./controllers/customer.controller";
import { CustomerService } from "./services/customer.service";
import { Customer } from "./entities/customer.entity";
import { CustomerRepository } from "./repositories/customer.repository";
import { CustomerComment } from "./entities/customer-comments.entity";
import { CustomerCommentController } from "./controllers/customer-comment.controller";
import { CustomerCommentRepository } from "./repositories/customer-comment.repository";
import { CustomerCommentService } from "./services/customer-comment.service";
import { Visit } from "../visits/entities/visit.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerComment, Visit]),
  ],
  controllers: [CustomerController, CustomerCommentController],
  providers: [
    CustomerService,
    CustomerCommentService,
    CustomerRepository,
    CustomerCommentRepository,
  ],
  exports: [
    CustomerService,
    CustomerCommentService,
    CustomerRepository,
    CustomerCommentRepository,
  ],
})
export class CustomerModule {}
