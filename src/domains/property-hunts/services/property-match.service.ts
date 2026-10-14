import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, IsNull, Not, Repository } from "typeorm";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { PaginationMapper } from "../../../shared/mappers/pagination.mapper";
import { Customer } from "../../customers/entities/customer.entity";
import { Property } from "../../properties/entities/property.entity";
import { User } from "../../users/entities/user.entity";
import {
  PropertyMatchFilterDto,
  PropertyMatchPinDto,
  PropertyMatchUpdateDto,
} from "../dtos/property-hunt.dto";
import { PropertyMatch } from "../entities/property-match.entity";
import {
  PropertyMatchOrigin,
  PropertyMatchStatus,
} from "../enums/property-hunt.enum";
import { PropertyHuntMapper } from "../mappers/property-hunt.mapper";
import { truncate } from "../helpers/text.helper";

/**
 * The properties a hunt found and the soft links between properties and
 * customers. Everything here is private to the broker: none of it reaches
 * the customer or changes the property itself.
 */
@Injectable()
export class PropertyMatchService {
  constructor(
    @InjectRepository(PropertyMatch)
    private readonly matchRepository: Repository<PropertyMatch>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async findAll(user: User, filter: PropertyMatchFilterDto) {
    const where: FindOptionsWhere<PropertyMatch> = {
      userId: user.id,
      active: true,
    };
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.huntId) where.huntId = filter.huntId;
    if (filter.status) where.status = filter.status;
    else if (!filter.includeDiscarded) {
      where.status = Not(PropertyMatchStatus.DISCARDED);
    }

    const [matches, total] = await this.matchRepository.findAndCount({
      where,
      relations: { customer: true },
      order: { score: "DESC", createdAt: "DESC" },
      skip: filter.skip,
      take: filter.limit,
    });
    return PaginationMapper.toDto(
      [matches.map((match) => PropertyHuntMapper.toMatchDto(match)), total],
      filter,
    );
  }

  /** How many suggestions each customer has, for the badges on their cards. */
  async countByCustomer(user: User, customerIds: string[]) {
    if (!customerIds.length) return {};
    const rows = await this.matchRepository
      .createQueryBuilder("match")
      .select("match.customerId", "customerId")
      .addSelect("COUNT(*)", "total")
      .where("match.userId = :userId", { userId: user.id })
      .andWhere("match.active = :active", { active: true })
      .andWhere("match.status != :discarded", {
        discarded: PropertyMatchStatus.DISCARDED,
      })
      .andWhere("match.customerId IN (:...customerIds)", { customerIds })
      .groupBy("match.customerId")
      .getRawMany<{ customerId: string; total: string }>();
    return Object.fromEntries(
      rows.map((row) => [row.customerId, Number(row.total)]),
    );
  }

  /** The customers a catalog property is softly linked to. */
  async findByProperty(user: User, propertyId: string) {
    const matches = await this.matchRepository.find({
      where: {
        userId: user.id,
        propertyId,
        active: true,
        status: Not(PropertyMatchStatus.DISCARDED),
        customerId: Not(IsNull()),
      },
      relations: { customer: true },
      order: { score: "DESC" },
    });
    return matches
      .filter((match) => match.customer)
      .map((match) => PropertyHuntMapper.toMatchDto(match));
  }

  async update(user: User, id: string, dto: PropertyMatchUpdateDto) {
    const match = await this.findEntity(user.id, id);
    if (dto.status) match.status = dto.status;
    if (dto.note !== undefined) match.note = dto.note?.trim() || null;
    if (dto.customerId !== undefined) {
      match.customerId = dto.customerId
        ? (await this.findCustomer(user.id, dto.customerId)).id
        : null;
      match.customer = null;
    }
    await this.matchRepository.save(match);
    this.notify(user.id, match);
    return PropertyHuntMapper.toMatchDto(
      await this.findEntity(user.id, match.id),
    );
  }

  /** Links a catalog property to a customer by hand. */
  async pin(user: User, dto: PropertyMatchPinDto) {
    const customer = await this.findCustomer(user.id, dto.customerId);
    const property = await this.propertyRepository.findOneBy({
      id: dto.propertyId,
      userId: user.id,
      active: true,
    });
    if (!property) throw new NotFoundException("Imóvel não encontrado.");

    const existing = await this.matchRepository.findOne({
      where: {
        userId: user.id,
        customerId: customer.id,
        propertyId: property.id,
        active: true,
      },
    });
    if (existing) {
      if (existing.status === PropertyMatchStatus.DISCARDED) {
        existing.status = PropertyMatchStatus.FAVORITE;
        await this.matchRepository.save(existing);
      }
      this.notify(user.id, existing);
      return PropertyHuntMapper.toMatchDto({ ...existing, customer });
    }

    const match = await this.matchRepository.save(
      this.matchRepository.create({
        userId: user.id,
        huntId: null,
        customerId: customer.id,
        propertyId: property.id,
        origin: PropertyMatchOrigin.MANUAL,
        portal: null,
        externalUrl: null,
        title: truncate(property.alias || property.address, 255),
        listing: null,
        coverImageUrl: null,
        price: property.price,
        score: 100,
        highlights: ["Escolhido por você"],
        warnings: [],
        status: PropertyMatchStatus.FAVORITE,
        note: null,
      }),
    );
    this.notify(user.id, match);
    return PropertyHuntMapper.toMatchDto({ ...match, customer });
  }

  async remove(user: User, id: string) {
    const match = await this.findEntity(user.id, id);
    await this.matchRepository.update({ id: match.id }, { active: false });
    this.notify(user.id, match);
  }

  private async findEntity(userId: string, id: string) {
    const match = await this.matchRepository.findOne({
      where: { id, userId, active: true },
      relations: { customer: true },
    });
    if (!match) throw new NotFoundException("Sugestão não encontrada.");
    return match;
  }

  private async findCustomer(userId: string, customerId: string) {
    const customer = await this.customerRepository.findOneBy({
      id: customerId,
      userId,
      active: true,
    });
    if (!customer) throw new NotFoundException("Cliente não encontrado.");
    return customer;
  }

  private notify(userId: string, match: PropertyMatch) {
    this.realtimeGateway.emitToUser(userId, "matches.updated", {
      huntId: match.huntId,
      customerId: match.customerId,
    });
  }
}
