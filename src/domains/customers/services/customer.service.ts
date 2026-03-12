import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerMapper } from "../mappers/customer.mapper";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../entities/customer.entity";
import { FindOptionsWhere, ILike } from "typeorm";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import { IsOptional, IsUUID } from "class-validator";
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";

dayjs.extend(isSameOrAfter);

export class CustomerCreateDto {
  @ValidateName()
  name: string;

  @ValidateBrazilianPhoneNumber()
  phone: string;

  @IsOptional()
  @IsUUID()
  kanbanId: string | null;

  @IsOptional()
  @ValidateCurrency({ isOptional: true })
  budget?: string | null;

  @IsOptional()
  @ValidateLongText({ isOptional: true })
  comment: string | null;
}

export class CustomerFilterDto {
  @IsOptional()
  @IsUUID()
  search: string | null;

  @IsOptional()
  @IsUUID()
  kanban: string | null;
}

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async findAll(
    user: User,
    filter: CustomerFilterDto,
    pagination: PaginationRequestDto,
  ) {
    const where: FindOptionsWhere<Customer> = {
      user: { id: user.id },
      active: true,
      ignored: false,
      pending: false,
    };

    if (filter.search) {
      const search = `%${filter.search}%`;
      where.name = ILike(search);
    }

    const [data, total] = await this.customerRepository.findAndCount({
      where: filter.search
        ? [
            { ...where, name: ILike(`%${filter.search}%`) },
            { ...where, phone: ILike(`%${filter.search}%`) },
          ]
        : where,
      relations: {
        comments: true,
        kanban: true,
        visits: true,
      },
      order: {
        [pagination.sortBy || "createdAt"]: pagination.sortOrder || "DESC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    for (const item of data) {
      item.visits = item.visits.filter((visit) => {
        return dayjs(visit.startsAt).isSameOrAfter(dayjs());
      });
    }

    return PaginationMapper.toDto(
      [CustomerMapper.toListDto(data), total],
      pagination,
    );
  }

  async findAllPending(
    user: User,
    filter: CustomerFilterDto,
    pagination: PaginationRequestDto,
  ) {
    const where: FindOptionsWhere<Customer> = {
      user: { id: user.id },
      active: true,
      ignored: false,
      pending: true,
    };

    const [data, total] = await this.customerRepository.findAndCount({
      where: filter.search
        ? [
            { ...where, name: ILike(`%${filter.search}%`) },
            { ...where, phone: ILike(`%${filter.search}%`) },
          ]
        : where,
      relations: {
        comments: true,
        kanban: true,
        visits: true,
      },
      order: {
        [pagination.sortBy || "createdAt"]: pagination.sortOrder || "DESC",
      },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return PaginationMapper.toDto(
      [CustomerMapper.toListDto(data), total],
      pagination,
    );
  }

  async findOne(user: User, id: string) {
    return CustomerMapper.toDto(
      await this.customerRepository
        .findOneOrFail({
          where: { id, user: { id: user.id } },
          relations: {
            comments: true,
            kanban: true,
            visits: true,
            chat: true,
          },
          order: {
            comments: { createdAt: "ASC" },
          },
        })
        .catch(() => {
          throw new NotFoundException("Customer not found");
        }),
    );
  }

  async save(user: User, dto: CustomerCreateDto, id?: string) {
    const entity = CustomerMapper.toEntity(dto, id);
    entity.user = user;
    entity.pending = false;
    entity.ignored = false;
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

  async createPendingIfNotExists(
    user: User,
    phone: string,
    name: string | null,
  ): Promise<void> {
    const existingCustomer = await this.customerRepository.findOne({
      where: { phone, user: { id: user.id } },
    });

    if (existingCustomer) return;

    const entity = new Customer();
    entity.phone = phone;
    entity.name = name;
    entity.user = user;
    entity.pending = true;
    entity.ignored = false;

    await this.customerRepository.save(entity);
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
