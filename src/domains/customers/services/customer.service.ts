import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerCreateDto } from "../dtos/customer-create.dto";
import { CustomerMapper } from "../mappers/customer.mapper";
import { User } from "../../users/entities/user.entity";
import { PaginationQueryDto } from "../../../shared/types/pagination-query.dto";
import { Customer } from "../entities/customer.entity";
import { PaginatedResult } from "../../../shared/types/api-response.types";

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async findAll(
    user: User,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<Customer>> {
    const [items, total] = await this.customerRepository.findAndCount({
      where: {
        user: { id: user.id },
        active: true,
      },
      order: {
        [pagination.sortBy || "createdAt"]: pagination.sortOrder || "DESC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return {
      data: items,
      total: total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async findOne(user: User, id: string) {
    return this.customerRepository
      .findOneByOrFail({ id, user: { id: user.id } })
      .catch(() => {
        throw new NotFoundException("Customer not found");
      });
  }

  async save(user: User, dto: CustomerCreateDto, id?: string) {
    const entity = CustomerMapper.toEntity(dto, id);
    entity.user = user;
    return this.customerRepository.save(entity);
  }

  async remove(user: User, id: string) {
    await this.customerRepository.update(
      { id, user: { id: user.id } },
      { active: false },
    );
  }
}
