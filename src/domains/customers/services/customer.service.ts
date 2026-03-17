import { Injectable, NotFoundException } from "@nestjs/common";
import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerMapper } from "../mappers/customer.mapper";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../entities/customer.entity";
import { FindOptionsWhere, ILike, Repository } from "typeorm";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { WhatsappChat } from "../../whatsapp/entities/whatsapp-chat.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomerComment } from "../entities/customer-comments.entity";

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

export class CustomerFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search: string | null;

  @IsOptional()
  @IsUUID()
  kanban: string | null;
}

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    @InjectRepository(CustomerComment)
    private readonly customerCommentRepository: Repository<CustomerComment>,
    @InjectRepository(WhatsappChat)
    private readonly whatsappChatRepository: Repository<WhatsappChat>,
  ) {}

  async findAll(user: User, dto: CustomerFilterDto) {
    const baseWhere: FindOptionsWhere<Customer> = {
      user: { id: user.id },
      active: true,
    };

    let where:
      | FindOptionsWhere<WhatsappChat>
      | FindOptionsWhere<WhatsappChat>[] = baseWhere;

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
      .leftJoinAndSelect("customer.kanban", "kanban")
      .leftJoinAndSelect("customer.comments", "comments")
      .leftJoinAndSelect("customer.visits", "visits")
      .where(where)
      .orderBy("kanban.order", "DESC")
      .addOrderBy("customer.name", "ASC")
      .skip(dto.skip)
      .take(dto.limit)
      .getManyAndCount();

    for (const item of data) {
      item.visits = item.visits.filter((visit) => {
        return dayjs(visit.startsAt).isSameOrAfter(dayjs());
      });
    }

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

    const hasMatchingChat = await this.whatsappChatRepository.findOne({
      where: { user: { id: user.id }, phone: entity.phone },
    });

    if (hasMatchingChat) {
      await this.whatsappChatRepository.update(
        {
          id: hasMatchingChat.id,
        },
        {
          ignored: false,
        },
      );
    }

    return await this.customerRepository.save(entity);
  }

  async remove(user: User, id: string) {
    await this.customerRepository.update(
      { id, user: { id: user.id } },
      { active: false },
    );
  }
}
