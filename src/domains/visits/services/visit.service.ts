import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Visit } from "../entities/visit.entity";
import { Repository } from "typeorm";
import { CreateVisitDto } from "../dtos/visit.dto";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { VisitMapper, VisitResponseDto } from "../mappers/visit.mapper";

@Injectable()
export class VisitService {
  private logger = new Logger(VisitService.name, { timestamp: true });

  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async save(
    user: User,
    dto: CreateVisitDto,
    visitId?: string,
  ): Promise<Visit> {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId, user: { id: user.id } },
    });

    if (!customer) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (startsAt >= endsAt) {
      throw new ConflictException(
        "A data de término deve ser posterior à data de início.",
      );
    }

    const visit = this.visitRepository.create({
      user,
      customer,
      address: dto.address,
      reference: dto.reference || null,
      startsAt,
      endsAt,
    });

    if (visitId) {
      visit.id = visitId;
    }

    return await this.visitRepository.save(visit);
  }

  async findAll(user: User): Promise<Visit[]> {
    return this.visitRepository.find({
      where: { user: { id: user.id } },
      order: { startsAt: "DESC" },
      relations: {
        customer: true,
      },
    });
  }

  async findByCustomer(user: User, customerId: string): Promise<Visit[]> {
    return this.visitRepository.find({
      where: {
        user: { id: user.id },
        customer: { id: customerId },
      },
      relations: {
        customer: true,
      },
      order: { startsAt: "DESC" },
    });
  }

  async findOne(user: User, id: string): Promise<VisitResponseDto> {
    return VisitMapper.toDto(
      await this.visitRepository
        .findOneOrFail({
          where: { id, user: { id: user.id } },
          relations: {
            customer: true,
          },
        })
        .catch(() => {
          this.logger.warn("[findOne]: Not found", { user, visitId: id });
          throw new NotFoundException("Visit not found for this user");
        }),
    );
  }

  async remove(user: User, id: string): Promise<void> {
    await this.visitRepository
      .delete({ id, user: { id: user.id } })
      .catch(() => {
        this.logger.warn("[remove]: Not Removed", { user, visitId: id });
        throw new NotFoundException("Visit was not deleted for this user");
      });
  }
}
