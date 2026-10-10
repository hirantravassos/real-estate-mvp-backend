import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PropertyMediaService } from "../../properties/services/property-media.service";
import { PropertyMediaType } from "../../properties/entities/property-media.entity";
import { DocumentOwnerType } from "../../documents/entities/document.entity";
import { DocumentService } from "../../documents/services/document.service";
import { DealChecklistItem } from "../entities/deal-checklist-item.entity";
import {
  DealChecklistStatus,
  DealEventActor,
  DealStatus,
} from "../enums/deal.enum";
import { DealMapper } from "../mappers/deal.mapper";
import { DealActivityService } from "./deal-activity.service";
import { DealService } from "./deal.service";

/**
 * The customer area. Reached only through the secret link, it shows the sale
 * progress, takes the customer's paperwork and leads to the signature.
 */
@Injectable()
export class DealPortalService {
  constructor(
    @InjectRepository(DealChecklistItem)
    private readonly checklistRepository: Repository<DealChecklistItem>,
    private readonly dealService: DealService,
    private readonly documentService: DocumentService,
    private readonly propertyMediaService: PropertyMediaService,
    private readonly activityService: DealActivityService,
  ) {}

  async getPortal(token: string) {
    const deal = await this.findDealByTokenOrThrow(token);
    const [documents, coverUrl] = await Promise.all([
      this.dealService.loadDocuments(deal),
      deal.propertyId
        ? this.findCoverUrl(deal.propertyId)
        : Promise.resolve(null),
    ]);
    return DealMapper.toPortalDto(deal, documents, coverUrl);
  }

  async uploadChecklistDocument(
    token: string,
    itemId: string,
    file: Express.Multer.File,
  ) {
    const deal = await this.findDealByTokenOrThrow(token);
    if (deal.status !== DealStatus.OPEN) {
      throw new BadRequestException("Esta negociação está encerrada.");
    }

    const item = await this.checklistRepository.findOne({
      where: {
        id: itemId,
        dealId: deal.id,
        active: true,
        requestedFromCustomer: true,
      },
    });
    if (!item) throw new NotFoundException("Documento não solicitado.");
    if (item.status === DealChecklistStatus.APPROVED) {
      throw new BadRequestException("Este documento já foi aprovado.");
    }

    await this.dealService.attachChecklistDocument(
      deal,
      item,
      file,
      DealEventActor.CUSTOMER,
    );
    this.activityService.notifyBroker(deal.userId, deal.id);

    return this.getPortal(token);
  }

  /** Only the contract and what the customer was asked to send. */
  async getDocumentUrl(token: string, documentId: string) {
    const deal = await this.findDealByTokenOrThrow(token);
    const document = await this.dealService.findDealDocumentOrThrow(
      deal,
      documentId,
    );

    const isContract = document.id === deal.contractDocumentId;
    const isCustomerItem =
      document.ownerType === DocumentOwnerType.DEAL_ITEM &&
      deal.checklistItems.some(
        (item) =>
          item.id === document.ownerId &&
          item.active &&
          item.requestedFromCustomer,
      );
    if (!isContract && !isCustomerItem) {
      throw new NotFoundException("Documento não encontrado.");
    }

    return this.documentService.getPresignedUrlForDocument(document);
  }

  private async findDealByTokenOrThrow(token: string) {
    const deal = await this.dealService
      .findDetailedOrThrow({ portalToken: token, active: true })
      .catch(() => null);
    if (!deal || !deal.portalEnabled) {
      throw new NotFoundException("Esta área não está disponível.");
    }
    return deal;
  }

  private async findCoverUrl(propertyId: string) {
    const media = await this.propertyMediaService
      .findAllForPresentation(propertyId)
      .catch(() => null);
    if (!media) return null;
    const images = media.filter(
      (item) => item.type === PropertyMediaType.IMAGE,
    );
    return (images.find((item) => item.isCover) ?? images[0])?.url ?? null;
  }
}
