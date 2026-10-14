import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash, randomBytes } from "crypto";
import { DataSource, FindOptionsWhere, In, Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Customer } from "../../customers/entities/customer.entity";
import { Property } from "../../properties/entities/property.entity";
import { DocumentService } from "../../documents/services/document.service";
import {
  Document,
  DocumentOwnerType,
} from "../../documents/entities/document.entity";
import { Deal } from "../entities/deal.entity";
import { DealChecklistItem } from "../entities/deal-checklist-item.entity";
import { DealSigner } from "../entities/deal-signer.entity";
import { DealMilestone } from "../entities/deal-milestone.entity";
import { DealParticipant } from "../entities/deal-participant.entity";
import { CustomerRole } from "../../customers/enums/customer.enum";
import {
  DEAL_SELLER_TYPE_LABELS,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
  DealChecklistStatus,
  DealEventActor,
  DealEventKind,
  DealParticipantRole,
  DealParty,
  DealPaymentMethod,
  DealSellerType,
  DealStage,
  DealStatus,
  DealSignerStatus,
} from "../enums/deal.enum";
import {
  buildChecklistTemplate,
  buildMilestoneTemplate,
  buildSellerTemplate,
} from "../constants/deal-templates.constant";
import {
  DealCancelDto,
  DealChecklistItemCreateDto,
  DealChecklistItemUpdateDto,
  DealChecklistReviewDto,
  DealCreateDto,
  DealFilterDto,
  DealMessageDto,
  DealMilestoneCreateDto,
  DealMilestoneUpdateDto,
  DealSignerCreateDto,
  DealUpdateDto,
} from "../dtos/deal.dto";
import { DealDocumentsDto, DealMapper } from "../mappers/deal.mapper";
import { DealActivityService } from "./deal-activity.service";

export const PAYMENT_METHOD_LABELS: Record<DealPaymentMethod, string> = {
  [DealPaymentMethod.CASH]: "à vista",
  [DealPaymentMethod.FINANCING]: "financiamento bancário",
  [DealPaymentMethod.CONSORTIUM]: "consórcio",
  [DealPaymentMethod.INSTALLMENTS]: "parcelado com o proprietário",
};

const DEAL_DETAIL_RELATIONS = {
  user: true,
  customer: true,
  property: true,
  checklistItems: true,
  signers: true,
  milestones: true,
  events: true,
  partners: true,
  participants: { customer: true },
} as const;

const formatMoney = (value: string | number | null) =>
  value === null
    ? null
    : Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      });

/** Long random secret that goes in the customer and signer links. */
export const createPublicToken = () => randomBytes(24).toString("base64url");

@Injectable()
export class DealService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    @InjectRepository(DealChecklistItem)
    private readonly checklistRepository: Repository<DealChecklistItem>,
    @InjectRepository(DealSigner)
    private readonly signerRepository: Repository<DealSigner>,
    @InjectRepository(DealMilestone)
    private readonly milestoneRepository: Repository<DealMilestone>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly documentService: DocumentService,
    private readonly activityService: DealActivityService,
  ) {}

  async findAll(user: User, filter: DealFilterDto) {
    const where: FindOptionsWhere<Deal> = { userId: user.id, active: true };
    if (filter.status) where.status = filter.status;

    const deals = await this.dealRepository.find({
      where,
      relations: {
        customer: true,
        property: true,
        checklistItems: true,
        signers: true,
        milestones: true,
        partners: true,
      },
      order: { updatedAt: "DESC" },
    });

    return deals.map((deal) => DealMapper.toListDto(deal));
  }

  /** Sales where the contact is the main buyer, another buyer or a seller. */
  async findAllByCustomer(user: User, customerId: string) {
    const deals = await this.dealRepository.find({
      where: [
        { userId: user.id, customerId, active: true },
        {
          userId: user.id,
          active: true,
          participants: { customerId, active: true },
        },
      ],
      relations: {
        customer: true,
        property: true,
        checklistItems: true,
        signers: true,
        milestones: true,
        partners: true,
      },
      order: { createdAt: "DESC" },
    });

    return deals.map((deal) => DealMapper.toListDto(deal));
  }

  async findOne(user: User, id: string) {
    const deal = await this.findDetailedOrThrow({
      id,
      userId: user.id,
      active: true,
    });
    return DealMapper.toDto(deal, await this.loadDocuments(deal));
  }

  async create(user: User, dto: DealCreateDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId, userId: user.id, active: true },
    });
    if (!customer) throw new NotFoundException("Cliente não encontrado.");

    const propertyId = dto.propertyId ?? null;
    if (propertyId) await this.findPropertyOrThrow(user.id, propertyId);

    const sellerCustomer = dto.sellerCustomerId
      ? await this.customerRepository.findOne({
          where: { id: dto.sellerCustomerId, userId: user.id, active: true },
        })
      : null;
    if (dto.sellerCustomerId && !sellerCustomer) {
      throw new NotFoundException("Vendedor não encontrado.");
    }
    if (sellerCustomer?.id === customer.id) {
      throw new BadRequestException(
        "O vendedor precisa ser outra pessoa, não o comprador.",
      );
    }

    const duplicate = await this.dealRepository.findOne({
      where: {
        userId: user.id,
        customerId: customer.id,
        status: DealStatus.OPEN,
        active: true,
      },
    });
    if (duplicate && duplicate.propertyId === propertyId) {
      throw new ConflictException(
        "Já existe uma venda em andamento para este cliente e imóvel.",
      );
    }

    const paymentMethod = dto.paymentMethod ?? null;
    const usesFgts = dto.usesFgts ?? false;
    const sellerType = dto.sellerType ?? DealSellerType.INDIVIDUAL;

    const dealId = await this.dataSource.transaction(async (manager) => {
      const deal = await manager.getRepository(Deal).save(
        manager.getRepository(Deal).create({
          userId: user.id,
          customerId: customer.id,
          propertyId,
          offerAmount: dto.offerAmount ?? null,
          downPaymentAmount: dto.downPaymentAmount ?? null,
          paymentMethod,
          usesFgts,
          sellerType,
          commissionPercentage:
            dto.commissionPercentage === null ||
            dto.commissionPercentage === undefined
              ? null
              : String(dto.commissionPercentage),
          portalToken: createPublicToken(),
        }),
      );

      const checklistRepository = manager.getRepository(DealChecklistItem);
      await checklistRepository.save(
        buildChecklistTemplate({ paymentMethod, usesFgts, sellerType }).map(
          (template, templateIndex) =>
            checklistRepository.create({
              ...template,
              dealId: deal.id,
              sortOrder: templateIndex,
            }),
        ),
      );

      if (sellerCustomer) {
        // The seller picked now takes the seller paperwork of the sale.
        const seller = await manager.getRepository(DealParticipant).save(
          manager.getRepository(DealParticipant).create({
            dealId: deal.id,
            role: DealParticipantRole.SELLER,
            customerId: sellerCustomer.id,
            name: sellerCustomer.name,
          }),
        );
        await checklistRepository.update(
          { dealId: deal.id, party: DealParty.SELLER },
          { participantId: seller.id },
        );
        if (!sellerCustomer.roles.includes(CustomerRole.SELLER)) {
          await manager.update(
            Customer,
            { id: sellerCustomer.id, userId: user.id },
            { roles: [...sellerCustomer.roles, CustomerRole.SELLER] },
          );
        }
      }

      const milestoneRepository = manager.getRepository(DealMilestone);
      await milestoneRepository.save(
        buildMilestoneTemplate({ paymentMethod }).map((title, titleIndex) =>
          milestoneRepository.create({
            title,
            dealId: deal.id,
            sortOrder: titleIndex,
          }),
        ),
      );

      await this.activityService.record(
        {
          dealId: deal.id,
          kind: DealEventKind.CREATED,
          actor: DealEventActor.BROKER,
          message: this.describeProposal(deal, "Sala de fechamento aberta"),
        },
        manager,
      );

      return deal.id;
    });

    return this.findOne(user, dealId);
  }

  async update(user: User, id: string, dto: DealUpdateDto) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    const proposalBefore = this.describeProposal(deal, "");
    const sellerTypeBefore = deal.sellerType;

    if (dto.propertyId !== undefined) {
      if (dto.propertyId)
        await this.findPropertyOrThrow(user.id, dto.propertyId);
      deal.propertyId = dto.propertyId ?? null;
    }
    if (dto.offerAmount !== undefined) deal.offerAmount = dto.offerAmount;
    if (dto.downPaymentAmount !== undefined) {
      deal.downPaymentAmount = dto.downPaymentAmount;
    }
    if (dto.paymentMethod !== undefined) deal.paymentMethod = dto.paymentMethod;
    if (dto.usesFgts !== undefined) deal.usesFgts = dto.usesFgts;
    if (dto.sellerType !== undefined) deal.sellerType = dto.sellerType;
    if (dto.commissionPercentage !== undefined) {
      deal.commissionPercentage =
        dto.commissionPercentage === null
          ? null
          : String(dto.commissionPercentage);
    }
    if (dto.notes !== undefined) deal.notes = dto.notes || null;

    await this.dealRepository.save(deal);

    if (deal.sellerType !== sellerTypeBefore) {
      await this.swapSellerTemplate(deal, sellerTypeBefore);
    }

    const proposalAfter = this.describeProposal(deal, "");
    if (proposalAfter !== proposalBefore) {
      await this.activityService.record({
        dealId: deal.id,
        kind: DealEventKind.PROPOSAL,
        actor: DealEventActor.BROKER,
        message: this.describeProposal(deal, "Proposta atualizada"),
      });
    }

    return this.findOne(user, id);
  }

  async changeStage(user: User, id: string, stage: DealStage) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    this.assertOpen(deal);
    if (stage === DealStage.COMPLETED) {
      throw new BadRequestException(
        "Use a opção de concluir a venda para finalizar.",
      );
    }
    if (deal.stage !== stage) {
      await this.moveToStage(deal, stage, DealEventActor.BROKER);
    }
    return this.findOne(user, id);
  }

  /** Moves the sale and writes it on the history, shared by every flow. */
  async moveToStage(deal: Deal, stage: DealStage, actor: DealEventActor) {
    const forward =
      DEAL_STAGE_ORDER.indexOf(stage) > DEAL_STAGE_ORDER.indexOf(deal.stage);
    await this.dealRepository.update({ id: deal.id }, { stage });
    deal.stage = stage;
    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.STAGE,
      actor,
      message: forward
        ? `Avançamos para a etapa "${DEAL_STAGE_LABELS[stage]}"`
        : `A venda voltou para a etapa "${DEAL_STAGE_LABELS[stage]}"`,
    });
  }

  async win(user: User, id: string) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    this.assertOpen(deal);
    await this.dealRepository.update(
      { id: deal.id },
      {
        status: DealStatus.WON,
        stage: DealStage.COMPLETED,
        closedAt: new Date(),
      },
    );
    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.WON,
      actor: DealEventActor.BROKER,
      message: "Venda concluída! Parabéns pelo novo imóvel 🎉",
    });
    return this.findOne(user, id);
  }

  async cancel(user: User, id: string, dto: DealCancelDto) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    this.assertOpen(deal);
    await this.dealRepository.update(
      { id: deal.id },
      {
        status: DealStatus.CANCELLED,
        closedAt: new Date(),
        cancellationReason: dto.reason || null,
      },
    );
    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.CANCELLED,
      actor: DealEventActor.BROKER,
      message: "Esta negociação foi encerrada",
    });
    return this.findOne(user, id);
  }

  async reopen(user: User, id: string) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    if (deal.status === DealStatus.OPEN) return this.findOne(user, id);
    await this.dealRepository.update(
      { id: deal.id },
      {
        status: DealStatus.OPEN,
        stage:
          deal.stage === DealStage.COMPLETED ? DealStage.CLOSING : deal.stage,
        closedAt: null,
        cancellationReason: null,
      },
    );
    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.STAGE,
      actor: DealEventActor.BROKER,
      message: "A negociação foi reaberta",
    });
    return this.findOne(user, id);
  }

  async remove(user: User, id: string) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    await this.dealRepository.update({ id: deal.id }, { active: false });
  }

  async setPortalEnabled(user: User, id: string, enabled: boolean) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    await this.dealRepository.update(
      { id: deal.id },
      { portalEnabled: enabled },
    );
    return this.findOne(user, id);
  }

  /** New customer link, the old one stops working right away. */
  async regeneratePortalToken(user: User, id: string) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    await this.dealRepository.update(
      { id: deal.id },
      { portalToken: createPublicToken(), portalEnabled: true },
    );
    return this.findOne(user, id);
  }

  async addMessage(user: User, id: string, dto: DealMessageDto) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.MESSAGE,
      actor: DealEventActor.BROKER,
      message: dto.message,
      visibleToCustomer: dto.visibleToCustomer ?? true,
    });
    return this.findOne(user, id);
  }

  async addChecklistItem(
    user: User,
    id: string,
    dto: DealChecklistItemCreateDto,
  ) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    let party = dto.party;
    let participantId: string | null = null;
    if (dto.participantId) {
      const participant = await this.dataSource
        .getRepository(DealParticipant)
        .findOne({
          where: { id: dto.participantId, dealId: deal.id, active: true },
        });
      if (!participant) throw new NotFoundException("Pessoa não encontrada.");
      participantId = participant.id;
      party =
        participant.role === DealParticipantRole.BUYER
          ? DealParty.BUYER
          : DealParty.SELLER;
    }
    const lastItem = await this.checklistRepository.findOne({
      where: { dealId: deal.id },
      order: { sortOrder: "DESC" },
    });
    const item = await this.checklistRepository.save(
      this.checklistRepository.create({
        dealId: deal.id,
        party,
        participantId,
        title: dto.title,
        description: dto.description || null,
        requestedFromCustomer: dto.requestedFromCustomer ?? false,
        screening: dto.screening ?? false,
        sortOrder: (lastItem?.sortOrder ?? -1) + 1,
      }),
    );
    return { ...(await this.findOne(user, id)), createdItemId: item.id };
  }

  async updateChecklistItem(
    user: User,
    id: string,
    itemId: string,
    dto: DealChecklistItemUpdateDto,
  ) {
    const item = await this.findChecklistItemOrThrow(user.id, id, itemId);
    if (dto.title !== undefined) item.title = dto.title;
    if (dto.description !== undefined)
      item.description = dto.description || null;
    if (dto.requestedFromCustomer !== undefined) {
      item.requestedFromCustomer = dto.requestedFromCustomer;
    }
    if (dto.screening !== undefined) item.screening = dto.screening;
    await this.checklistRepository.save(item);
    return this.findOne(user, id);
  }

  async reviewChecklistItem(
    user: User,
    id: string,
    itemId: string,
    dto: DealChecklistReviewDto,
  ) {
    const item = await this.findChecklistItemOrThrow(user.id, id, itemId);
    item.status = dto.status;
    item.reviewedAt =
      dto.status === DealChecklistStatus.PENDING ? null : new Date();
    item.rejectionReason =
      dto.status === DealChecklistStatus.REJECTED ||
      dto.status === DealChecklistStatus.RESTRICTED
        ? dto.rejectionReason || null
        : null;
    await this.checklistRepository.save(item);

    if (dto.status !== DealChecklistStatus.PENDING) {
      const reason = item.rejectionReason ? `: ${item.rejectionReason}` : "";
      const messages: Partial<Record<DealChecklistStatus, string>> = {
        [DealChecklistStatus.APPROVED]: `"${item.title}" foi aprovado`,
        [DealChecklistStatus.REJECTED]: `"${item.title}" precisa ser enviado de novo${reason}`,
        [DealChecklistStatus.RESTRICTED]: `Restrição encontrada em "${item.title}"${reason}`,
      };
      await this.activityService.record({
        dealId: item.dealId,
        kind: DealEventKind.DOCUMENT,
        actor: DealEventActor.BROKER,
        message: messages[dto.status] ?? `"${item.title}" foi conferido`,
        // Restrictions are about the seller, the buyer hears it from the broker.
        visibleToCustomer:
          item.requestedFromCustomer &&
          dto.status !== DealChecklistStatus.RESTRICTED,
      });
    }

    return this.findOne(user, id);
  }

  async removeChecklistItem(user: User, id: string, itemId: string) {
    const item = await this.findChecklistItemOrThrow(user.id, id, itemId);
    await this.checklistRepository.update({ id: item.id }, { active: false });
    return this.findOne(user, id);
  }

  async uploadChecklistDocument(
    user: User,
    id: string,
    itemId: string,
    file: Express.Multer.File,
  ) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    const item = await this.findChecklistItemOrThrow(user.id, id, itemId);
    await this.attachChecklistDocument(deal, item, file, DealEventActor.BROKER);
    return this.findOne(user, id);
  }

  /**
   * Files the broker sends count as checked. Files the customer or a
   * partner sends wait for the broker to look at them.
   */
  async attachChecklistDocument(
    deal: Deal,
    item: DealChecklistItem,
    file: Express.Multer.File,
    actor: DealEventActor,
    partnerName?: string,
  ) {
    await this.documentService.upload(
      deal.userId,
      DocumentOwnerType.DEAL_ITEM,
      item.id,
      "deals",
      file,
    );
    await this.markChecklistReceived(deal, item, actor, partnerName);
  }

  /** Keeps a file the server already holds, like a photo from the inbox, in a checklist item. */
  async saveChecklistFile(
    user: User,
    id: string,
    itemId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    const item = await this.findChecklistItemOrThrow(user.id, id, itemId);
    await this.documentService.uploadBuffer(
      deal.userId,
      DocumentOwnerType.DEAL_ITEM,
      item.id,
      "deals",
      file,
    );
    await this.markChecklistReceived(deal, item, DealEventActor.BROKER);
    return this.findOne(user, id);
  }

  private async markChecklistReceived(
    deal: Deal,
    item: DealChecklistItem,
    actor: DealEventActor,
    partnerName?: string,
  ) {
    const sentByBroker = actor === DealEventActor.BROKER;
    item.status = sentByBroker
      ? DealChecklistStatus.APPROVED
      : DealChecklistStatus.SUBMITTED;
    item.submittedAt = new Date();
    item.reviewedAt = sentByBroker ? new Date() : null;
    item.rejectionReason = null;
    await this.checklistRepository.save(item);

    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.DOCUMENT,
      actor,
      message: sentByBroker
        ? `"${item.title}" foi guardado pelo corretor`
        : actor === DealEventActor.PARTNER
          ? `"${item.title}" foi enviado por ${partnerName ?? "parceria"} para conferência`
          : `"${item.title}" foi enviado para conferência`,
      visibleToCustomer: item.requestedFromCustomer,
    });
  }

  async removeDocument(user: User, id: string, documentId: string) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    const document = await this.findDealDocumentOrThrow(deal, documentId);

    if (document.id === deal.contractDocumentId) {
      throw new BadRequestException(
        "Envie uma nova versão do contrato em vez de apagar.",
      );
    }

    await this.documentService.remove(user.id, document.id);

    if (document.ownerType === DocumentOwnerType.DEAL_ITEM) {
      const remaining = await this.documentService.findAllByOwner(
        user.id,
        DocumentOwnerType.DEAL_ITEM,
        document.ownerId,
      );
      if (remaining.length === 0) {
        await this.checklistRepository.update(
          { id: document.ownerId, dealId: deal.id },
          {
            status: DealChecklistStatus.PENDING,
            submittedAt: null,
            reviewedAt: null,
          },
        );
      }
    }

    return this.findOne(user, id);
  }

  async getDocumentUrl(user: User, id: string, documentId: string) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    const document = await this.findDealDocumentOrThrow(deal, documentId);
    return this.documentService.getPresignedUrlForDocument(document);
  }

  /**
   * A new contract version restarts the signatures, because they point to
   * the fingerprint of the file that was signed.
   */
  async uploadContract(user: User, id: string, file: Express.Multer.File) {
    const deal = await this.findOwnedOrThrow(user.id, id, { signers: true });
    this.assertOpen(deal);

    const sha256 = createHash("sha256").update(file.buffer).digest("hex");
    const document = await this.documentService.upload(
      user.id,
      DocumentOwnerType.DEAL,
      deal.id,
      "deals",
      file,
    );
    const isNewVersion = Boolean(deal.contractDocumentId);

    await this.dealRepository.update(
      { id: deal.id },
      {
        contractDocumentId: document.id,
        contractSha256: sha256,
        contractUploadedAt: new Date(),
      },
    );

    const touchedSigners = (deal.signers ?? []).filter(
      (signer) => signer.active && signer.status !== DealSignerStatus.PENDING,
    );
    if (touchedSigners.length > 0) {
      await this.signerRepository.update(
        { id: In(touchedSigners.map((signer) => signer.id)) },
        {
          status: DealSignerStatus.PENDING,
          method: null,
          signedAt: null,
          signedName: null,
          signedDocumentNumber: null,
          signedIp: null,
          signedUserAgent: null,
          signedContractSha256: null,
          signedDocumentId: null,
        },
      );
    }

    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.CONTRACT,
      actor: DealEventActor.BROKER,
      message:
        isNewVersion && touchedSigners.length > 0
          ? "Uma nova versão do contrato chegou, as assinaturas recomeçaram"
          : isNewVersion
            ? "Uma nova versão do contrato chegou"
            : "O contrato está pronto para assinatura",
    });

    const contractIndex = DEAL_STAGE_ORDER.indexOf(DealStage.CONTRACT);
    if (DEAL_STAGE_ORDER.indexOf(deal.stage) < contractIndex) {
      await this.moveToStage(deal, DealStage.CONTRACT, DealEventActor.SYSTEM);
    }

    return this.findOne(user, id);
  }

  async addSigner(user: User, id: string, dto: DealSignerCreateDto) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    await this.signerRepository.save(
      this.signerRepository.create({
        dealId: deal.id,
        name: dto.name,
        role: dto.role,
        email: dto.email || null,
        phone: dto.phone || null,
        signingToken: createPublicToken(),
      }),
    );
    return this.findOne(user, id);
  }

  async removeSigner(user: User, id: string, signerId: string) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    const result = await this.signerRepository.update(
      { id: signerId, dealId: deal.id, active: true },
      { active: false },
    );
    if (!result.affected)
      throw new NotFoundException("Assinante não encontrado.");
    return this.findOne(user, id);
  }

  async addMilestone(user: User, id: string, dto: DealMilestoneCreateDto) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    const lastMilestone = await this.milestoneRepository.findOne({
      where: { dealId: deal.id },
      order: { sortOrder: "DESC" },
    });
    await this.milestoneRepository.save(
      this.milestoneRepository.create({
        dealId: deal.id,
        title: dto.title,
        dueDate: dto.dueDate ? dto.dueDate.substring(0, 10) : null,
        sortOrder: (lastMilestone?.sortOrder ?? -1) + 1,
      }),
    );
    return this.findOne(user, id);
  }

  async updateMilestone(
    user: User,
    id: string,
    milestoneId: string,
    dto: DealMilestoneUpdateDto,
  ) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId, dealId: deal.id, active: true },
    });
    if (!milestone) throw new NotFoundException("Etapa não encontrada.");

    if (dto.title !== undefined) milestone.title = dto.title;
    if (dto.dueDate !== undefined) {
      milestone.dueDate = dto.dueDate ? dto.dueDate.substring(0, 10) : null;
    }
    const justCompleted = dto.completed === true && !milestone.completedAt;
    if (dto.completed !== undefined) {
      milestone.completedAt = dto.completed
        ? (milestone.completedAt ?? new Date())
        : null;
    }
    await this.milestoneRepository.save(milestone);

    if (justCompleted) {
      await this.activityService.record({
        dealId: deal.id,
        kind: DealEventKind.MILESTONE,
        actor: DealEventActor.BROKER,
        message: `Etapa cumprida: ${milestone.title}`,
      });
    }

    return this.findOne(user, id);
  }

  async removeMilestone(user: User, id: string, milestoneId: string) {
    const deal = await this.findOwnedOrThrow(user.id, id);
    const result = await this.milestoneRepository.update(
      { id: milestoneId, dealId: deal.id, active: true },
      { active: false },
    );
    if (!result.affected) throw new NotFoundException("Etapa não encontrada.");
    return this.findOne(user, id);
  }

  async findDetailedOrThrow(where: FindOptionsWhere<Deal>) {
    const deal = await this.dealRepository.findOne({
      where,
      relations: DEAL_DETAIL_RELATIONS,
    });
    if (!deal) throw new NotFoundException("Venda não encontrada.");
    return deal;
  }

  /** Every file of the sale: checklist uploads, contracts and signed copies. */
  async loadDocuments(deal: Deal): Promise<DealDocumentsDto> {
    const itemIds = (deal.checklistItems ?? []).map((item) => item.id);
    const [itemDocuments, dealDocuments] = await Promise.all([
      this.documentService.findAllByOwners(
        deal.userId,
        DocumentOwnerType.DEAL_ITEM,
        itemIds,
      ),
      this.documentService.findAllByOwner(
        deal.userId,
        DocumentOwnerType.DEAL,
        deal.id,
      ),
    ]);

    const byItem = new Map<string, Document[]>();
    for (const document of itemDocuments) {
      byItem.set(document.ownerId, [
        ...(byItem.get(document.ownerId) ?? []),
        document,
      ]);
    }
    const byId = new Map<string, Document>(
      [...itemDocuments, ...dealDocuments].map((document) => [
        document.id,
        document,
      ]),
    );

    return { byItem, byId };
  }

  /** A document is part of the sale when it hangs from it or from one of its items. */
  async findDealDocumentOrThrow(deal: Deal, documentId: string) {
    const document = await this.documentService.findOneOrThrow(
      deal.userId,
      documentId,
    );

    if (
      document.ownerType === DocumentOwnerType.DEAL &&
      document.ownerId === deal.id
    ) {
      return document;
    }

    if (document.ownerType === DocumentOwnerType.DEAL_ITEM) {
      const item = await this.checklistRepository.findOne({
        where: { id: document.ownerId, dealId: deal.id },
      });
      if (item) return document;
    }

    throw new NotFoundException("Documento não encontrado.");
  }

  assertOpen(deal: Deal) {
    if (deal.status !== DealStatus.OPEN) {
      throw new BadRequestException(
        "Esta venda está encerrada. Reabra para continuar.",
      );
    }
  }

  /**
   * The seller turned out to be a company or an estate, for example. Adds
   * the paperwork of the new kind of seller and drops the old one that was
   * never touched, keeping anything already sent or checked.
   */
  private async swapSellerTemplate(deal: Deal, previousType: DealSellerType) {
    const previousTitles = new Set(
      buildSellerTemplate(previousType).map((template) => template.title),
    );
    const nextTemplates = buildSellerTemplate(deal.sellerType);
    const nextTitles = new Set(nextTemplates.map((template) => template.title));

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DealChecklistItem);
      const sellerItems = await repository.find({
        where: { dealId: deal.id, party: DealParty.SELLER, active: true },
      });

      const untouchedLeftovers = sellerItems.filter(
        (item) =>
          previousTitles.has(item.title) &&
          !nextTitles.has(item.title) &&
          item.status === DealChecklistStatus.PENDING &&
          !item.submittedAt,
      );
      if (untouchedLeftovers.length > 0) {
        await repository.update(
          { id: In(untouchedLeftovers.map((item) => item.id)) },
          { active: false },
        );
      }

      // Each seller keeps their own papers: the missing ones are added per
      // seller, and the sale without named sellers keeps one shared set.
      const owners = [
        ...new Set(sellerItems.map((item) => item.participantId ?? null)),
      ];
      const lastItem = await repository.findOne({
        where: { dealId: deal.id },
        order: { sortOrder: "DESC" },
      });
      let nextSortOrder = (lastItem?.sortOrder ?? -1) + 1;
      for (const owner of owners.length ? owners : [null]) {
        const existingTitles = new Set(
          sellerItems
            .filter((item) => (item.participantId ?? null) === owner)
            .map((item) => item.title),
        );
        await repository.save(
          nextTemplates
            .filter((template) => !existingTitles.has(template.title))
            .map((template) =>
              repository.create({
                ...template,
                dealId: deal.id,
                participantId: owner,
                sortOrder: nextSortOrder++,
              }),
            ),
        );
      }

      await this.activityService.record(
        {
          dealId: deal.id,
          kind: DealEventKind.DOCUMENT,
          actor: DealEventActor.BROKER,
          message: `Vendedor agora é ${DEAL_SELLER_TYPE_LABELS[deal.sellerType].toLowerCase()}, documentos do vendedor atualizados`,
          visibleToCustomer: false,
        },
        manager,
      );
    });
  }

  private async findOwnedOrThrow(
    userId: string,
    id: string,
    relations: { signers?: boolean } = {},
  ) {
    const deal = await this.dealRepository.findOne({
      where: { id, userId, active: true },
      relations,
    });
    if (!deal) throw new NotFoundException("Venda não encontrada.");
    return deal;
  }

  private async findChecklistItemOrThrow(
    userId: string,
    id: string,
    itemId: string,
  ) {
    const deal = await this.findOwnedOrThrow(userId, id);
    const item = await this.checklistRepository.findOne({
      where: { id: itemId, dealId: deal.id, active: true },
    });
    if (!item)
      throw new NotFoundException("Item da documentação não encontrado.");
    return item;
  }

  private async findPropertyOrThrow(userId: string, propertyId: string) {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId, userId, active: true },
    });
    if (!property) throw new NotFoundException("Imóvel não encontrado.");
    return property;
  }

  /** "Proposta atualizada: R$ 450.000, financiamento bancário com FGTS". */
  private describeProposal(deal: Deal, prefix: string) {
    const parts = [
      formatMoney(deal.offerAmount),
      deal.paymentMethod
        ? `${PAYMENT_METHOD_LABELS[deal.paymentMethod]}${deal.usesFgts ? " com FGTS" : ""}`
        : null,
      deal.downPaymentAmount
        ? `sinal de ${formatMoney(deal.downPaymentAmount)}`
        : null,
    ].filter(Boolean);

    if (parts.length === 0) return prefix;
    return `${prefix}: ${parts.join(", ")}`;
  }
}
