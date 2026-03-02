import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerCreateDto } from "../dtos/customer-create.dto";
import { CustomerMapper } from "../mappers/customer.mapper";
import { User } from "../../users/entities/user.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async findAll(user: User, pagination: PaginationRequestDto) {
    const data = await this.customerRepository.findAndCount({
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

    return PaginationMapper.toDto(data, pagination);
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
