import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CustomerRepository } from "../repositories/customer.repository";
import { CustomerMapper } from "../mappers/customer.mapper";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../entities/customer.entity";
import { FindOptionsWhere, ILike, Raw, Repository } from "typeorm";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { ValidateName } from "../../../shared/decorators/validation/name.decorator";
import { ValidatePhoneNumber } from "../../../shared/decorators/validation/phone-number.decorator";
import { ValidateLongText } from "../../../shared/decorators/validation/long-text.decorator";
import {
  ArrayMaxSize,
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
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { CustomerRole } from "../enums/customer.enum";

dayjs.extend(isSameOrAfter);

export class CustomerCreateDto {
  @ValidateName()
  name: string;

  @ValidatePhoneNumber()
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

  /** Left out keeps the saved roles; a new contact starts as a buyer. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: "Escolha ao menos um papel para o contato" })
  @ArrayMaxSize(Object.values(CustomerRole).length)
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
  role: CustomerRole | null;
}

/** Matches the contacts holding the role among the ones in their set. */
const hasRole = (role: CustomerRole) =>
  Raw((column) => `FIND_IN_SET(:role, ${column}) > 0`, { role });

@Injectable()
export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    @InjectRepository(CustomerComment)
    private readonly customerCommentRepository: Repository<CustomerComment>,
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
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
      baseWhere.roles = hasRole(dto.role);
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

    if (filter.role) {
      where.roles = hasRole(filter.role);
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
    if (id) {
      await this.ensureOwnedCustomer(user, id);
    }

    if (dto.kanbanId) {
      await this.ensureOwnedKanban(user, dto.kanbanId);
    }

    const entity = CustomerMapper.toEntity(dto, id);
    entity.user = user;
    try {
      return await this.customerRepository.save(entity);
    } catch {
      throw new ConflictException("Telefone já cadastrado para este usuário");
    }
  }

  /**
   * Blocks the upsert by client id takeover: a PATCH only reaches save when the
   * row already belongs to the authenticated broker, otherwise TypeORM would
   * overwrite another tenant's customer and move its ownership.
   */
  private async ensureOwnedCustomer(user: User, id: string): Promise<void> {
    const owned = await this.customerRepository.findOne({
      where: { id, user: { id: user.id } },
      select: { id: true },
    });

    if (!owned) {
      throw new NotFoundException("Customer not found");
    }
  }

  private async ensureOwnedKanban(user: User, kanbanId: string): Promise<void> {
    const owned = await this.kanbanRepository.findOne({
      where: { id: kanbanId, user: { id: user.id }, active: true },
      select: { id: true },
    });

    if (!owned) {
      throw new NotFoundException("Kanban not found");
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
