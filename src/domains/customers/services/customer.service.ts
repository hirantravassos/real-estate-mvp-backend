import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerMapper } from "../mappers/customer.mapper";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../entities/customer.entity";
import { FindOptionsWhere, ILike } from "typeorm";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { CustomerFilterDto } from "../dtos/customer-filter.dto";
import { CustomerCreateDto } from "../dtos/customer-create.dto";

dayjs.extend(isSameOrAfter);

@Injectable()
export class CustomerService {
  constructor(private readonly customerRepository: CustomerRepository) {}

  async findAll(user: User, dto: CustomerFilterDto) {
    const baseWhere: FindOptionsWhere<Customer> = {
      user: { id: user.id },
      active: true,
      lost: dto.lost ?? false,
    };

    let where: FindOptionsWhere<Customer> | FindOptionsWhere<Customer>[] =
      baseWhere;

    if (dto.kanban) {
      baseWhere.kanban = { id: dto.kanban };
    }

    if (dto.search) {
      where = [
        { ...baseWhere, name: ILike(`%${dto.search}%`) },
        { ...baseWhere, phone: ILike(`%${dto.search}%`) },
      ];
    }

    const [data, total] = await this.customerRepository
      .createQueryBuilder("customer")
      // .leftJoinAndSelect("customer.kanban", "kanban")
      // .leftJoinAndSelect("customer.comments", "comments")
      // .leftJoinAndSelect("customer.visits", "visits")
      .where(where)
      // .orderBy("kanban.order", "DESC")
      .addOrderBy("customer.name", "ASC")
      .skip(dto.skip)
      .take(dto.limit)
      .getManyAndCount();

    return PaginationMapper.toDto([CustomerMapper.toListDto(data), total], dto);
  }

  async findAllPending(
    user: User,
    filter: CustomerFilterDto,
    pagination: PaginationRequestDto,
  ) {
    const where: FindOptionsWhere<Customer> = {
      user: { id: user.id },
      active: true,
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
    try {
      return await this.customerRepository.save(entity);
    } catch {
      throw new ConflictException("Telefone já cadastrado para este usuário");
    }
  }

  async markAsLost(user: User, id: string) {
    const customer = await this.findOne(user, id);

    await this.customerRepository.update(
      { id: customer.id, user: { id: user.id } },
      {
        lost: true,
        kanban: null,
      },
    );
  }

  async markAsVisible(user: User, id: string) {
    const customer = await this.findOne(user, id);

    await this.customerRepository.update(
      { id: customer.id, user: { id: user.id } },
      {
        lost: false,
      },
    );
  }

  async remove(user: User, id: string) {
    await this.customerRepository.update(
      { id, user: { id: user.id } },
      { active: false },
    );
  }
}
