import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, IsNull, Repository } from "typeorm";
import { Customer } from "../../customers/entities/customer.entity";
import { CustomerRole } from "../../customers/enums/customer.enum";
import { User } from "../../users/entities/user.entity";
import {
  buildChecklistTemplate,
  buildSellerTemplate,
} from "../constants/deal-templates.constant";
import {
  DealParticipantCreateDto,
  DealParticipantUpdateDto,
} from "../dtos/deal.dto";
import { DealChecklistItem } from "../entities/deal-checklist-item.entity";
import { DealParticipant } from "../entities/deal-participant.entity";
import { Deal } from "../entities/deal.entity";
import {
  DealChecklistStatus,
  DealEventActor,
  DealEventKind,
  DealParticipantRole,
  DealParty,
} from "../enums/deal.enum";
import { DealActivityService } from "./deal-activity.service";
import { DealService } from "./deal.service";

const ROLE_LABELS: Record<DealParticipantRole, string> = {
  [DealParticipantRole.BUYER]: "comprador",
  [DealParticipantRole.SELLER]: "vendedor",
};

const CUSTOMER_ROLE_BY_PARTICIPANT: Record<DealParticipantRole, CustomerRole> =
  {
    [DealParticipantRole.BUYER]: CustomerRole.BUYER,
    [DealParticipantRole.SELLER]: CustomerRole.SELLER,
  };

const partyOf = (role: DealParticipantRole) =>
  role === DealParticipantRole.BUYER ? DealParty.BUYER : DealParty.SELLER;

/**
 * Every buyer and seller of a sale besides the main customer. Each one has
 * their own paperwork in the checklist, and may be only a nickname when the
 * broker has the documents but not the person.
 */
@Injectable()
export class DealParticipantService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(DealParticipant)
    private readonly participantRepository: Repository<DealParticipant>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly dealService: DealService,
    private readonly activityService: DealActivityService,
  ) {}

  async addParticipant(
    user: User,
    dealId: string,
    dto: DealParticipantCreateDto,
  ) {
    const deal = await this.findOwnedDealOrThrow(user.id, dealId);
    this.dealService.assertOpen(deal);
    const customer = await this.findCustomerOrNull(user.id, dto.customerId);
    const name = dto.name?.trim() || customer?.name || null;

    await this.dataSource.transaction(async (manager) => {
      const participant = await this.createParticipant(manager, deal, {
        role: dto.role,
        customer,
        name: name ?? (await this.nextNickname(manager, deal.id, dto.role)),
      });
      await this.giveChecklist(
        manager,
        deal,
        participant,
        dto.withChecklist ?? true,
      );
      await this.activityService.record(
        {
          dealId: deal.id,
          kind: DealEventKind.DOCUMENT,
          actor: DealEventActor.BROKER,
          message: `${participant.name} entrou como ${ROLE_LABELS[participant.role]}`,
          visibleToCustomer: false,
        },
        manager,
      );
    });

    return this.dealService.findOne(user, dealId);
  }

  async updateParticipant(
    user: User,
    dealId: string,
    participantId: string,
    dto: DealParticipantUpdateDto,
  ) {
    const participant = await this.findOwnedParticipantOrThrow(
      user.id,
      dealId,
      participantId,
    );
    if (dto.customerId !== undefined) {
      const customer = await this.findCustomerOrNull(user.id, dto.customerId);
      participant.customerId = customer?.id ?? null;
      if (customer) {
        await this.addCustomerRole(
          this.dataSource.manager,
          customer,
          participant.role,
        );
        if (dto.name === undefined) participant.name = customer.name;
      }
    }
    if (dto.name !== undefined && dto.name.trim()) {
      participant.name = dto.name.trim();
    }
    await this.participantRepository.save(participant);
    return this.dealService.findOne(user, dealId);
  }

  /**
   * The person leaves the sale. Papers never touched go with them, anything
   * already sent or checked stays in the sale without an owner.
   */
  async removeParticipant(user: User, dealId: string, participantId: string) {
    const participant = await this.findOwnedParticipantOrThrow(
      user.id,
      dealId,
      participantId,
    );
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DealChecklistItem);
      const items = await repository.find({
        where: { dealId: participant.dealId, participantId, active: true },
      });
      const untouched = items.filter(
        (item) =>
          item.status === DealChecklistStatus.PENDING && !item.submittedAt,
      );
      if (untouched.length) {
        await repository.update(
          { id: In(untouched.map((item) => item.id)) },
          { active: false },
        );
      }
      await repository.update(
        { dealId: participant.dealId, participantId },
        { participantId: null },
      );
      await manager.update(
        DealParticipant,
        { id: participant.id },
        { active: false },
      );
      await this.activityService.record(
        {
          dealId: participant.dealId,
          kind: DealEventKind.DOCUMENT,
          actor: DealEventActor.BROKER,
          message: `${participant.name} saiu da venda`,
          visibleToCustomer: false,
        },
        manager,
      );
    });
    return this.dealService.findOne(user, dealId);
  }

  private async createParticipant(
    manager: EntityManager,
    deal: Deal,
    input: {
      role: DealParticipantRole;
      customer: Customer | null;
      name: string;
    },
  ) {
    const repository = manager.getRepository(DealParticipant);
    const last = await repository.findOne({
      where: { dealId: deal.id },
      order: { sortOrder: "DESC" },
    });
    if (input.customer) {
      await this.addCustomerRole(manager, input.customer, input.role);
    }
    return repository.save(
      repository.create({
        dealId: deal.id,
        role: input.role,
        customerId: input.customer?.id ?? null,
        name: input.name.substring(0, 255),
        sortOrder: (last?.sortOrder ?? -1) + 1,
      }),
    );
  }

  /**
   * The first named seller takes the seller paperwork already in the sale.
   * Any other person gets their own copy of the usual papers, when asked.
   */
  private async giveChecklist(
    manager: EntityManager,
    deal: Deal,
    participant: DealParticipant,
    withChecklist: boolean,
  ) {
    const repository = manager.getRepository(DealChecklistItem);

    if (participant.role === DealParticipantRole.SELLER) {
      const otherSellers = await manager.getRepository(DealParticipant).count({
        where: {
          dealId: deal.id,
          role: DealParticipantRole.SELLER,
          active: true,
        },
      });
      if (otherSellers === 1) {
        const adopted = await repository.update(
          {
            dealId: deal.id,
            party: DealParty.SELLER,
            participantId: IsNull(),
            active: true,
          },
          { participantId: participant.id },
        );
        if (adopted.affected) return;
      }
    }
    if (!withChecklist) return;

    const templates =
      participant.role === DealParticipantRole.SELLER
        ? buildSellerTemplate(deal.sellerType)
        : buildChecklistTemplate({
            paymentMethod: deal.paymentMethod,
            usesFgts: deal.usesFgts,
            sellerType: deal.sellerType,
          }).filter((template) => template.party === DealParty.BUYER);

    const last = await repository.findOne({
      where: { dealId: deal.id },
      order: { sortOrder: "DESC" },
    });
    const firstSortOrder = (last?.sortOrder ?? -1) + 1;
    await repository.save(
      templates.map((template, templateIndex) =>
        repository.create({
          ...template,
          party: partyOf(participant.role),
          dealId: deal.id,
          participantId: participant.id,
          sortOrder: firstSortOrder + templateIndex,
        }),
      ),
    );
  }

  /** "Vendedor 2", "Comprador 3": a nickname when there is no name yet. */
  private async nextNickname(
    manager: EntityManager,
    dealId: string,
    role: DealParticipantRole,
  ) {
    const count = await manager.getRepository(DealParticipant).count({
      where: { dealId, role },
    });
    const label = ROLE_LABELS[role];
    // The main buyer counts as the first one.
    const position = role === DealParticipantRole.BUYER ? count + 2 : count + 1;
    return `${label.charAt(0).toUpperCase()}${label.substring(1)} ${position}`;
  }

  private async addCustomerRole(
    manager: EntityManager,
    customer: Customer,
    role: DealParticipantRole,
  ) {
    const customerRole = CUSTOMER_ROLE_BY_PARTICIPANT[role];
    if (customer.roles.includes(customerRole)) return;
    await manager.update(
      Customer,
      { id: customer.id, userId: customer.userId },
      { roles: [...customer.roles, customerRole] },
    );
  }

  private async findCustomerOrNull(
    userId: string,
    customerId: string | null | undefined,
  ) {
    if (!customerId) return null;
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, userId, active: true },
    });
    if (!customer) throw new NotFoundException("Contato não encontrado.");
    return customer;
  }

  private async findOwnedDealOrThrow(userId: string, dealId: string) {
    const deal = await this.dealRepository.findOne({
      where: { id: dealId, userId, active: true },
    });
    if (!deal) throw new NotFoundException("Venda não encontrada.");
    return deal;
  }

  private async findOwnedParticipantOrThrow(
    userId: string,
    dealId: string,
    participantId: string,
  ) {
    const participant = await this.participantRepository.findOne({
      where: {
        id: participantId,
        dealId,
        active: true,
        deal: { userId, active: true },
      },
    });
    if (!participant) throw new NotFoundException("Pessoa não encontrada.");
    return participant;
  }
}
