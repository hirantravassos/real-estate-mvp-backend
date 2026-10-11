import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerMapper } from "../mappers/customer.mapper";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../entities/customer.entity";
import { FindOptionsWhere, ILike, Repository } from "typeorm";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidateBrazilianPhoneNumber } from "../../../shared/decorators/validation/brazilian-phone-number.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ValidateCurrency } from "../../../shared/decorators/validation/currency.decorator";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { PaginationRequestDto } from "../../../shared/dtos/pagination-request.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomerComment } from "../entities/customer-comments.entity";
import { ValidateBoolean } from "../../../shared/decorators/validation/boolean.decorator";
import { Visit } from "../../visits/entities/visit.entity";
import { CustomerAvatarDto } from "../dtos/customer-avatar.dto";
import {
  CUSTOMER_ROLE_COLUMNS,
  CustomerRole,
} from "../enums/customer-role.enum";
import { PropertyContact } from "../../properties/entities/property-contact.entity";

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

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerAvatarDto)
  avatar?: CustomerAvatarDto | null;

  /** Left out on updates that should keep the roles as they are. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: "Escolha ao menos um tipo de contato" })
  @ArrayUnique()
  @IsEnum(CustomerRole, { each: true })
  roles?: CustomerRole[];
}

export class CustomerFilterDto extends PaginationRequestDto {
  @IsOptional()
  @IsString()
  search: string | null;

  @IsOptional()
  @IsUUID()
  kanban: string | null;

  @IsOptional()
  @ValidateBoolean()
  lost: boolean | null;

  @IsOptional()
  @IsEnum(CustomerRole)
  role?: CustomerRole | null;
}

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    @InjectRepository(CustomerComment)
    private readonly customerCommentRepository: Repository<CustomerComment>,
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(PropertyContact)
    private readonly propertyContactRepository: Repository<PropertyContact>,
  ) {}

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

    if (dto.role) {
      baseWhere[CUSTOMER_ROLE_COLUMNS[dto.role]] = true;
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
    const customer = await this.customerRepository
      .findOneOrFail({
        where: { id, user: { id: user.id } },
        relations: {
          comments: true,
          kanban: true,
          visits: true,
        },
        order: {
          comments: { createdAt: "ASC" },
        },
      })
      .catch(() => {
        throw new NotFoundException("Customer not found");
      });

    const ownedContacts = await this.propertyContactRepository.find({
      where: {
        customerId: customer.id,
        userId: user.id,
        active: true,
        property: { active: true },
      },
      relations: { property: true },
      order: { createdAt: "DESC" },
    });

    return CustomerMapper.toDto(
      customer,
      ownedContacts.map((contact) => contact.property),
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

  /**
   * The contact behind a property owner. Someone already on the list keeps
   * their other roles and just becomes an owner too; a contact deleted
   * before comes back as an owner only.
   */
  async findOrCreateOwner(
    userId: string,
    phone: string,
    name?: string | null,
  ): Promise<Customer> {
    const digits = phone.replaceAll(/\D/g, "");
    const existing = await this.customerRepository.findOneBy({
      userId,
      phone: digits,
    });

    if (existing?.active) {
      if (!existing.isOwner) {
        existing.isOwner = true;
        await this.customerRepository.update(existing.id, { isOwner: true });
      }
      return existing;
    }

    if (existing) {
      await this.customerRepository.update(existing.id, {
        active: true,
        lost: false,
        kanban: null,
        isBuyer: false,
        isOwner: true,
        isPartner: false,
      });
      return this.customerRepository.findOneByOrFail({ id: existing.id });
    }

    try {
      return await this.customerRepository.save(
        this.customerRepository.create({
          userId,
          phone: digits,
          name: name?.trim() || "Proprietário",
          isBuyer: false,
          isOwner: true,
          isPartner: false,
        }),
      );
    } catch {
      // Another request created the same contact in the meantime.
      return this.customerRepository.findOneByOrFail({ userId, phone: digits });
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

    await this.visitRepository.delete({
      customerId: customer.id,
      user: { id: user.id },
    });
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
