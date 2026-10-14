import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHmac, timingSafeEqual } from "crypto";
import { Repository } from "typeorm";
import { authConfig } from "../../../config/auth.config";
import { DocumentOwnerType } from "../../documents/entities/document.entity";
import { DocumentService } from "../../documents/services/document.service";
import {
  onlyDigits,
  phoneMatchingKey,
} from "../../inbox/helpers/whatsapp-phone.helper";
import { DealPartnerChecklistItemDto } from "../dtos/deal.dto";
import { DealChecklistItem } from "../entities/deal-checklist-item.entity";
import { DealParticipant } from "../entities/deal-participant.entity";
import { DealPartner } from "../entities/deal-partner.entity";
import {
  DealChecklistStatus,
  DealEventActor,
  DealEventKind,
  DealParticipantRole,
  DealParty,
  DealStatus,
} from "../enums/deal.enum";
import { DealMapper } from "../mappers/deal.mapper";
import { DealActivityService } from "./deal-activity.service";
import { DealService } from "./deal.service";
import { profileImagePathOf } from "../../users/helpers/profile-image.helper";

/** How long a confirmed number keeps the area open, the tab forgets it sooner. */
const SESSION_HOURS = 12;
const SESSION_MILLISECONDS = SESSION_HOURS * 60 * 60 * 1000;
/** Wrong numbers in a row before the area locks for a while. */
const MAXIMUM_FAILED_VERIFICATIONS = 5;
const LOCK_MINUTES = 15;

const firstNameOf = (name: string) => name.trim().split(/\s+/)[0];

/** Area code and the last eight digits, any way the number was typed. */
const sameNumber = (stored: string, typed: string) => {
  const typedDigits = onlyDigits(typed);
  if (typedDigits.length < 10) return false;
  return phoneMatchingKey(stored) === phoneMatchingKey(typedDigits);
};

export interface PartnerAreaSession {
  sessionToken: string;
  expiresAt: string;
}

/**
 * The public area of a partner broker. The link alone shows nothing but a
 * greeting: the partner confirms their own WhatsApp number and gets a signed
 * session for the device. Changing the link ends every session.
 *
 * A partner sends files to any open paper of the sale, and only removes the
 * files they sent themselves, never the broker's or another partner's.
 */
@Injectable()
export class DealPartnerAreaService {
  private readonly sessionKey: Buffer;

  constructor(
    @Inject(authConfig.KEY)
    authConfiguration: ConfigType<typeof authConfig>,
    @InjectRepository(DealPartner)
    private readonly partnerRepository: Repository<DealPartner>,
    @InjectRepository(DealChecklistItem)
    private readonly checklistRepository: Repository<DealChecklistItem>,
    @InjectRepository(DealParticipant)
    private readonly participantRepository: Repository<DealParticipant>,
    private readonly dealService: DealService,
    private readonly documentService: DocumentService,
    private readonly activityService: DealActivityService,
  ) {
    const secret = authConfiguration.jwtSecret;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in the environment");
    }
    // Its own key, so a partner session is never a valid login token.
    this.sessionKey = createHmac("sha256", secret)
      .update("deal-partner-area-session")
      .digest();
  }

  /** What the link shows before the number is confirmed: only who is asking. */
  async getGate(token: string) {
    const partner = await this.findPartnerByTokenOrThrow(token);
    const deal = await this.dealService.findDetailedOrThrow({
      id: partner.dealId,
      active: true,
    });
    return {
      partnerFirstName: firstNameOf(partner.name),
      broker: {
        name: deal.user.name,
        profileImage: profileImagePathOf(deal.user.profileImage),
        avatar: deal.user.avatar ?? null,
      },
      phoneRegistered: Boolean(partner.phone),
      lockedUntil: this.lockedUntil(partner),
    };
  }

  /** Opens the area when the typed number is the one the broker saved. */
  async verify(token: string, phone: string): Promise<PartnerAreaSession> {
    const partner = await this.findPartnerByTokenOrThrow(token);
    const lockedUntil = this.lockedUntil(partner);
    if (lockedUntil) {
      throw new HttpException(
        `Muitas tentativas. Tente de novo depois de ${LOCK_MINUTES} minutos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!partner.phone) {
      throw new ConflictException(
        "O corretor ainda não cadastrou o seu WhatsApp. Peça para ele cadastrar e enviar o acesso de novo.",
      );
    }

    if (!sameNumber(partner.phone, phone)) {
      const failed = partner.failedVerifications + 1;
      const locks = failed >= MAXIMUM_FAILED_VERIFICATIONS;
      await this.partnerRepository.update(
        { id: partner.id },
        {
          failedVerifications: locks ? 0 : failed,
          verificationLockedUntil: locks
            ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
            : null,
        },
      );
      throw new ForbiddenException(
        locks
          ? `Número diferente do cadastrado. A área ficou travada por ${LOCK_MINUTES} minutos.`
          : `Esse não é o número cadastrado pelo corretor. Restam ${MAXIMUM_FAILED_VERIFICATIONS - failed} tentativas.`,
      );
    }

    if (partner.failedVerifications || partner.verificationLockedUntil) {
      await this.partnerRepository.update(
        { id: partner.id },
        { failedVerifications: 0, verificationLockedUntil: null },
      );
    }
    return this.issueSession(partner);
  }

  async getArea(token: string, session: string | undefined) {
    const partner = await this.findAuthorizedPartner(token, session);
    return this.areaOf(partner);
  }

  /** Partners help with any open paper, the broker still checks every file. */
  async uploadChecklistDocument(
    token: string,
    session: string | undefined,
    itemId: string,
    file: Express.Multer.File,
  ) {
    const partner = await this.findAuthorizedPartner(token, session);
    const deal = await this.findOpenDeal(partner);
    const item = await this.findItemOrThrow(deal.id, itemId);
    if (item.status === DealChecklistStatus.APPROVED) {
      throw new BadRequestException(
        "Este documento já foi aprovado pelo corretor.",
      );
    }

    await this.dealService.attachChecklistDocument(
      deal,
      item,
      file,
      DealEventActor.PARTNER,
      { id: partner.id, name: firstNameOf(partner.name) },
    );
    this.activityService.notifyBroker(deal.userId, deal.id);
    return this.areaOf(partner);
  }

  /** A paper the list did not have, sent by the partner for the broker to check. */
  async addChecklistItem(
    token: string,
    session: string | undefined,
    dto: DealPartnerChecklistItemDto,
  ) {
    const partner = await this.findAuthorizedPartner(token, session);
    const deal = await this.findOpenDeal(partner);

    let party = dto.party;
    let participantId: string | null = null;
    if (dto.participantId) {
      const participant = await this.participantRepository.findOne({
        where: { id: dto.participantId, dealId: deal.id, active: true },
      });
      if (!participant) throw new NotFoundException("Pessoa não encontrada.");
      participantId = participant.id;
      party =
        participant.role === DealParticipantRole.BUYER
          ? DealParty.BUYER
          : DealParty.SELLER;
    }

    const last = await this.checklistRepository.findOne({
      where: { dealId: deal.id },
      order: { sortOrder: "DESC" },
    });
    const item = await this.checklistRepository.save(
      this.checklistRepository.create({
        dealId: deal.id,
        party,
        participantId,
        title: dto.title,
        description: `Incluído por ${firstNameOf(partner.name)}, da parceria`,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      }),
    );
    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.DOCUMENT,
      actor: DealEventActor.PARTNER,
      message: `${firstNameOf(partner.name)} incluiu "${item.title}" na documentação`,
      visibleToCustomer: false,
    });
    return { ...(await this.areaOf(partner)), createdItemId: item.id };
  }

  /**
   * Removes a file the partner sent. Files of the broker or of another
   * partner, and files of a paper the broker already approved, stay.
   */
  async removeDocument(
    token: string,
    session: string | undefined,
    documentId: string,
  ) {
    const partner = await this.findAuthorizedPartner(token, session);
    const deal = await this.findOpenDeal(partner);
    const document = await this.dealService.findDealDocumentOrThrow(
      deal,
      documentId,
    );
    if (
      document.ownerType !== DocumentOwnerType.DEAL_ITEM ||
      document.uploadedByPartnerId !== partner.id
    ) {
      throw new ForbiddenException(
        "Você só pode apagar os arquivos que você mesmo enviou.",
      );
    }
    const item = await this.findItemOrThrow(deal.id, document.ownerId);
    if (item.status === DealChecklistStatus.APPROVED) {
      throw new BadRequestException(
        "Este documento já foi aprovado pelo corretor. Peça para ele, se precisar trocar.",
      );
    }

    await this.documentService.remove(deal.userId, document.id);
    const remaining = await this.documentService.findAllByOwner(
      deal.userId,
      DocumentOwnerType.DEAL_ITEM,
      item.id,
    );
    if (!remaining.length && item.status === DealChecklistStatus.SUBMITTED) {
      await this.checklistRepository.update(
        { id: item.id, dealId: deal.id },
        { status: DealChecklistStatus.PENDING, submittedAt: null },
      );
    }
    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.DOCUMENT,
      actor: DealEventActor.PARTNER,
      message: `${firstNameOf(partner.name)} apagou um arquivo de "${item.title}"`,
      visibleToCustomer: false,
    });
    this.activityService.notifyBroker(deal.userId, deal.id);
    return this.areaOf(partner);
  }

  /** The contract and any checklist file of the sale. */
  async getDocumentUrl(
    token: string,
    session: string | undefined,
    documentId: string,
  ) {
    const partner = await this.findAuthorizedPartner(token, session);
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

  private async areaOf(partner: DealPartner) {
    const deal = await this.dealService.findDetailedOrThrow({
      id: partner.dealId,
      active: true,
    });
    const documents = await this.dealService.loadDocuments(deal);
    return DealMapper.toPartnerAreaDto(deal, partner, documents);
  }

  private issueSession(partner: DealPartner): PartnerAreaSession {
    const expiresAt = Date.now() + SESSION_MILLISECONDS;
    return {
      sessionToken: `${expiresAt}.${this.sign(partner, expiresAt)}`,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  /** Bound to the partner and to the link, a new link ends old sessions. */
  private sign(partner: DealPartner, expiresAt: number) {
    return createHmac("sha256", this.sessionKey)
      .update(`${partner.id}:${partner.accessToken}:${expiresAt}`)
      .digest("base64url");
  }

  private isValidSession(partner: DealPartner, session: string | undefined) {
    if (!session) return false;
    const [expiresText, signature] = session.split(".");
    const expiresAt = Number(expiresText);
    if (!signature || !Number.isSafeInteger(expiresAt)) return false;
    if (expiresAt <= Date.now()) return false;
    const expected = Buffer.from(this.sign(partner, expiresAt));
    const received = Buffer.from(signature);
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }

  private async findAuthorizedPartner(
    token: string,
    session: string | undefined,
  ) {
    const partner = await this.findPartnerByTokenOrThrow(token);
    if (!this.isValidSession(partner, session)) {
      throw new UnauthorizedException(
        "Confirme o seu número de WhatsApp para entrar.",
      );
    }
    return partner;
  }

  private lockedUntil(partner: DealPartner) {
    return partner.verificationLockedUntil &&
      partner.verificationLockedUntil.getTime() > Date.now()
      ? partner.verificationLockedUntil
      : null;
  }

  private async findOpenDeal(partner: DealPartner) {
    const deal = await this.dealService.findDetailedOrThrow({
      id: partner.dealId,
      active: true,
    });
    if (deal.status !== DealStatus.OPEN) {
      throw new BadRequestException("Esta negociação está encerrada.");
    }
    return deal;
  }

  private async findItemOrThrow(dealId: string, itemId: string) {
    const item = await this.checklistRepository.findOne({
      where: { id: itemId, dealId, active: true },
    });
    if (!item) throw new NotFoundException("Documento não encontrado.");
    return item;
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
