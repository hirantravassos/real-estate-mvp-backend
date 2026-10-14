import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { CustomerRole } from "../../customers/enums/customer.enum";
import { DocumentOwnerType } from "../../documents/entities/document.entity";
import { DocumentService } from "../../documents/services/document.service";
import { Deal } from "../entities/deal.entity";
import { DealChecklistItem } from "../entities/deal-checklist-item.entity";
import { DealPartner } from "../entities/deal-partner.entity";
import { DealSigner } from "../entities/deal-signer.entity";
import {
  DealChecklistStatus,
  DealEventActor,
  DealEventKind,
  DealSignerRole,
  DealSignerStatus,
  DealStatus,
} from "../enums/deal.enum";
import {
  DealCommissionSplitDto,
  DealPartnerCreateDto,
  DealPartnerUpdateDto,
} from "../dtos/deal.dto";
import { DealMapper } from "../mappers/deal.mapper";
import { DealActivityService } from "./deal-activity.service";
import { createPublicToken, DealService } from "./deal.service";

const firstNameOf = (name: string) => name.trim().split(/\s+/)[0];

const toShareOrNull = (value: number | null | undefined) =>
  value === null || value === undefined ? null : String(value);

/**
 * Partner brokers of a sale. The broker adds them on the proposal, each one
 * gets a private area to send paperwork and sign, and a commission share.
 */
@Injectable()
export class DealPartnerService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DealPartner)
    private readonly partnerRepository: Repository<DealPartner>,
    @InjectRepository(DealSigner)
    private readonly signerRepository: Repository<DealSigner>,
    @InjectRepository(DealChecklistItem)
    private readonly checklistRepository: Repository<DealChecklistItem>,
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly dealService: DealService,
    private readonly documentService: DocumentService,
    private readonly activityService: DealActivityService,
  ) {}

  async addPartner(user: User, dealId: string, dto: DealPartnerCreateDto) {
    const deal = await this.findOwnedDealOrThrow(user.id, dealId);
    this.dealService.assertOpen(deal);
    await this.assertShareFits(deal.id, dto.commissionShare ?? null);

    const customerId = dto.customerId ?? null;
    let customer: Customer | null = null;
    if (customerId) {
      customer = await this.customerRepository.findOne({
        where: { id: customerId, userId: user.id, active: true },
      });
      if (!customer) throw new NotFoundException("Contato não encontrado.");
    }

    await this.dataSource.transaction(async (manager) => {
      if (customer && !customer.roles.includes(CustomerRole.PARTNER)) {
        await manager.update(
          Customer,
          { id: customer.id, userId: user.id },
          { roles: [...customer.roles, CustomerRole.PARTNER] },
        );
      }

      const partnerRepository = manager.getRepository(DealPartner);
      const partner = await partnerRepository.save(
        partnerRepository.create({
          dealId: deal.id,
          customerId,
          name: dto.name,
          phone: dto.phone || null,
          email: dto.email || null,
          creci: dto.creci || null,
          commissionShare: toShareOrNull(dto.commissionShare),
          accessToken: createPublicToken(),
        }),
      );

      if (dto.signsContract ?? true) {
        await this.createSigner(partner, manager);
      }

      await this.activityService.record(
        {
          dealId: deal.id,
          kind: DealEventKind.PARTNER,
          actor: DealEventActor.BROKER,
          message: `${partner.name} entrou na venda como parceria`,
          visibleToCustomer: false,
        },
        manager,
      );
    });

    return this.dealService.findOne(user, dealId);
  }

  async updatePartner(
    user: User,
    dealId: string,
    partnerId: string,
    dto: DealPartnerUpdateDto,
  ) {
    const partner = await this.findOwnedPartnerOrThrow(
      user.id,
      dealId,
      partnerId,
    );

    if (dto.commissionShare !== undefined) {
      await this.assertShareFits(
        partner.dealId,
        dto.commissionShare,
        partner.id,
      );
      partner.commissionShare = toShareOrNull(dto.commissionShare);
    }
    if (dto.name !== undefined) partner.name = dto.name;
    if (dto.phone !== undefined) partner.phone = dto.phone || null;
    if (dto.email !== undefined) partner.email = dto.email || null;
    if (dto.creci !== undefined) partner.creci = dto.creci || null;
    await this.partnerRepository.save(partner);

    const signer = await this.findPartnerSigner(partner.id);
    if (dto.signsContract === true && !signer) {
      await this.createSigner(partner);
    } else if (dto.signsContract === false && signer) {
      await this.signerRepository.update({ id: signer.id }, { active: false });
    } else if (signer && signer.status === DealSignerStatus.PENDING) {
      // Contact details follow the partner until they sign.
      await this.signerRepository.update(
        { id: signer.id },
        { name: partner.name, phone: partner.phone, email: partner.email },
      );
    }

    return this.dealService.findOne(user, dealId);
  }

  /**
   * Saves the whole commission and every partner's share together, so the
   * broker can move points from one partner to another without the sum
   * passing 100% halfway.
   */
  async splitCommission(
    user: User,
    dealId: string,
    dto: DealCommissionSplitDto,
  ) {
    const deal = await this.findOwnedDealOrThrow(user.id, dealId);
    this.dealService.assertOpen(deal);

    const partners = await this.partnerRepository.find({
      where: { dealId: deal.id, active: true },
    });
    const partnersById = new Map(
      partners.map((partner) => [partner.id, partner]),
    );
    const sharesById = new Map(
      partners.map((partner) => [
        partner.id,
        Number(partner.commissionShare ?? 0),
      ]),
    );
    for (const item of dto.partners) {
      if (!partnersById.has(item.partnerId)) {
        throw new NotFoundException("Parceria não encontrada.");
      }
      sharesById.set(item.partnerId, item.commissionShare ?? 0);
    }

    const partnersShare = [...sharesById.values()].reduce(
      (total, share) => total + share,
      0,
    );
    if (partnersShare > 100) {
      throw new BadRequestException(
        "A soma das parcerias passou de 100% da comissão.",
      );
    }

    await this.dataSource.transaction(async (manager) => {
      if (dto.commissionPercentage !== undefined) {
        await manager.update(
          Deal,
          { id: deal.id, userId: user.id },
          {
            commissionPercentage: toShareOrNull(dto.commissionPercentage),
          },
        );
      }
      for (const item of dto.partners) {
        await manager.update(
          DealPartner,
          { id: item.partnerId, dealId: deal.id, active: true },
          { commissionShare: toShareOrNull(item.commissionShare) },
        );
      }
      await this.activityService.record(
        {
          dealId: deal.id,
          kind: DealEventKind.PARTNER,
          actor: DealEventActor.BROKER,
          message: "Divisão da comissão atualizada",
          visibleToCustomer: false,
        },
        manager,
      );
    });

    return this.dealService.findOne(user, dealId);
  }

  /** The partner link stops working and the partner leaves the signers. */
  async removePartner(user: User, dealId: string, partnerId: string) {
    const partner = await this.findOwnedPartnerOrThrow(
      user.id,
      dealId,
      partnerId,
    );
    await this.partnerRepository.update({ id: partner.id }, { active: false });
    await this.signerRepository.update(
      { partnerId: partner.id, active: true },
      { active: false },
    );
    await this.activityService.record({
      dealId: partner.dealId,
      kind: DealEventKind.PARTNER,
      actor: DealEventActor.BROKER,
      message: `${partner.name} saiu da parceria`,
      visibleToCustomer: false,
    });
    return this.dealService.findOne(user, dealId);
  }

  /** New partner link, the old one stops working right away. */
  async regenerateToken(user: User, dealId: string, partnerId: string) {
    const partner = await this.findOwnedPartnerOrThrow(
      user.id,
      dealId,
      partnerId,
    );
    await this.partnerRepository.update(
      { id: partner.id },
      { accessToken: createPublicToken() },
    );
    return this.dealService.findOne(user, dealId);
  }

  async getArea(token: string) {
    const partner = await this.findPartnerByTokenOrThrow(token);
    const deal = await this.dealService.findDetailedOrThrow({
      id: partner.dealId,
      active: true,
    });
    const documents = await this.dealService.loadDocuments(deal);
    return DealMapper.toPartnerAreaDto(deal, partner, documents);
  }

  /** Partners help with any paperwork, the broker still checks every file. */
  async uploadChecklistDocument(
    token: string,
    itemId: string,
    file: Express.Multer.File,
  ) {
    const partner = await this.findPartnerByTokenOrThrow(token);
    const deal = await this.dealService.findDetailedOrThrow({
      id: partner.dealId,
      active: true,
    });
    if (deal.status !== DealStatus.OPEN) {
      throw new BadRequestException("Esta negociação está encerrada.");
    }

    const item = await this.checklistRepository.findOne({
      where: { id: itemId, dealId: deal.id, active: true },
    });
    if (!item) throw new NotFoundException("Documento não encontrado.");
    if (item.status === DealChecklistStatus.APPROVED) {
      throw new BadRequestException("Este documento já foi aprovado.");
    }

    await this.dealService.attachChecklistDocument(
      deal,
      item,
      file,
      DealEventActor.PARTNER,
      firstNameOf(partner.name),
    );
    this.activityService.notifyBroker(deal.userId, deal.id);

    return this.getArea(token);
  }

  /** The contract and any checklist file of the sale. */
  async getDocumentUrl(token: string, documentId: string) {
    const partner = await this.findPartnerByTokenOrThrow(token);
    const deal = await this.dealService.findDetailedOrThrow({
      id: partner.dealId,
      active: true,
    });
    const document = await this.dealService.findDealDocumentOrThrow(
      deal,
      documentId,
    );

    const isContract = document.id === deal.contractDocumentId;
    const isChecklistItem =
      document.ownerType === DocumentOwnerType.DEAL_ITEM &&
      deal.checklistItems.some(
        (item) => item.id === document.ownerId && item.active,
      );
    if (!isContract && !isChecklistItem) {
      throw new NotFoundException("Documento não encontrado.");
    }

    return this.documentService.getPresignedUrlForDocument(document);
  }

  private async createSigner(partner: DealPartner, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(DealSigner)
      : this.signerRepository;
    await repository.save(
      repository.create({
        dealId: partner.dealId,
        partnerId: partner.id,
        name: partner.name,
        phone: partner.phone,
        email: partner.email,
        role: DealSignerRole.PARTNER,
        signingToken: createPublicToken(),
      }),
    );
  }

  private findPartnerSigner(partnerId: string) {
    return this.signerRepository.findOne({
      where: { partnerId, active: true },
    });
  }

  /** All partners together can not take more than the whole commission. */
  private async assertShareFits(
    dealId: string,
    share: number | null,
    ignoredPartnerId?: string,
  ) {
    if (!share) return;
    const partners = await this.partnerRepository.find({
      where: { dealId, active: true },
    });
    const othersShare = partners
      .filter((partner) => partner.id !== ignoredPartnerId)
      .reduce(
        (total, partner) => total + Number(partner.commissionShare ?? 0),
        0,
      );
    if (othersShare + share > 100) {
      throw new BadRequestException(
        `A parceria passaria de 100% da comissão. Sobram ${Math.max(0, 100 - othersShare)}% para dividir.`,
      );
    }
  }

  private async findOwnedDealOrThrow(userId: string, dealId: string) {
    const deal = await this.dealRepository.findOne({
      where: { id: dealId, userId, active: true },
    });
    if (!deal) throw new NotFoundException("Venda não encontrada.");
    return deal;
  }

  private async findOwnedPartnerOrThrow(
    userId: string,
    dealId: string,
    partnerId: string,
  ) {
    const partner = await this.partnerRepository.findOne({
      where: {
        id: partnerId,
        dealId,
        active: true,
        deal: { userId, active: true },
      },
    });
    if (!partner) throw new NotFoundException("Parceria não encontrada.");
    return partner;
  }

  private async findPartnerByTokenOrThrow(token: string) {
    const partner = await this.partnerRepository.findOne({
      where: { accessToken: token, active: true, deal: { active: true } },
    });
    if (!partner) {
      throw new NotFoundException("Esta área não está disponível.");
    }
    return partner;
  }
}
