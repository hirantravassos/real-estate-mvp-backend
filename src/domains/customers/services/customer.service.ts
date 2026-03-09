import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerMapper } from "../mappers/customer.mapper";
import { User } from "../../users/entities/user.entity";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import { IsOptional, IsUUID } from "class-validator";

export class CustomerCreateDto {
  @ValidateName()
  name: string;

  @ValidateBrazilianPhoneNumber()
  phone: string;

  @IsOptional()
  @IsUUID()
  kanbanId: string | null;

  @ValidateLongText({ isOptional: true })
  comment: string | null;
}

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) { }

  async findAll(user: User, pagination: PaginationRequestDto) {
    const data = await this.customerRepository.findAndCount({
      where: {
        user: { id: user.id },
        active: true,
        ignored: false,
        pending: false,
      },
      relations: {
        comments: true,
        kanban: true,
      },
      order: {
        [pagination.sortBy || "createdAt"]: pagination.sortOrder || "DESC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return PaginationMapper.toDto(data, pagination);
  }

  async findAllPending(user: User, pagination: PaginationRequestDto) {
    const data = await this.customerRepository.findAndCount({
      where: {
        user: { id: user.id },
        active: true,
        ignored: false,
        pending: true,
      },
      relations: {
        comments: true,
        kanban: true,
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
    return await this.customerRepository
      .findOneOrFail({
        where: { id, user: { id: user.id } },
        relations: {
          comments: true,
          kanban: true,
        },
      })
      .catch(() => {
        throw new NotFoundException("Customer not found");
      });
  }

  async findOneByPhone(user: User, phone: string) {
    return this.customerRepository
      .findOneOrFail({
        where: { phone, user: { id: user.id } },
      })
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

  async ignore(user: User, id: string) {
    return this.customerRepository.update(
      {
        user: { id: user.id },
        id,
      },
      {
        ignored: true,
        pending: false,
      },
    );
  }

  async accept(user: User, id: string) {
    return this.customerRepository.update(
      {
        user: { id: user.id },
        id,
      },
      {
        ignored: false,
        pending: false,
      },
    );
  }

  async moveToKanban(user: User, customerId: string, kanbanId: string | null) {
    const customer = await this.customerRepository
      .findOneOrFail({
        where: { id: customerId, user: { id: user.id } },
      })
      .catch(() => {
        throw new NotFoundException("Customer not found");
      });

    customer.kanban = kanbanId ? ({ id: kanbanId } as never) : null;
    return this.customerRepository.save(customer);
  }
}
