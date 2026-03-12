import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "../../users/entities/user.entity";
import { CustomerCommentMapper } from "../mappers/customer-comment.mapper";
import { CustomerCommentRepository } from "../repositories/customer-comment.repository";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import { Repository } from "typeorm";
import { Customer } from "../entities/customer.entity";
import { InjectRepository } from "@nestjs/typeorm";

export class CustomerCommentCreateDto {
  @ValidateLongText()
  comment: string;
}

@Injectable()
export class CustomerCommentService {
  constructor(
    private readonly customerCommentRepository: CustomerCommentRepository,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findAll(
    user: User,
    customerId: string,
    pagination: PaginationRequestDto,
  ) {
    const data = await this.customerCommentRepository.findAndCount({
      where: {
        customer: { id: customerId, user: { id: user.id } },
        active: true,
      },
      order: {
        [pagination.sortBy || "createdAt"]: pagination.sortOrder || "DESC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return PaginationMapper.toDto(data, pagination);
  }

  async findOne(user: User, customerId: string, id: string) {
    return this.customerCommentRepository
      .findOneByOrFail({
        id,
        customer: { user: { id: user.id }, id: customerId },
      })
      .catch(() => {
        throw new NotFoundException("Customer Comment not found");
      });
  }

  async save(
    user: User,
    customerId: string,
    dto: CustomerCommentCreateDto,
    id?: string,
  ) {
    const customer = await this.customerRepository
      .findOneOrFail({
        where: { user: { id: user.id }, id: customerId },
      })
      .catch(() => {
        console.warn(
          "[CustomerCommentService.save]: Customer not found to relate new comment",
        );
        throw new NotFoundException("Customer not found");
      });
    const entity = CustomerCommentMapper.toEntity(dto, id);
    entity.customer = customer;
    return this.customerCommentRepository.save(entity);
  }

  async remove(user: User, customerId: string, id: string) {
    return this.customerCommentRepository.update(
      {
        id,
        customer: { user: { id: user.id }, id: customerId },
      },
      {
        active: false,
      },
    );
  }
}
