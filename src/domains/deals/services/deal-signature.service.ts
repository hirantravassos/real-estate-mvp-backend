import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { DocumentService } from "../../documents/services/document.service";
import { DocumentOwnerType } from "../../documents/entities/document.entity";
import { DocumentMapper } from "../../documents/mappers/document.mapper";
import { Deal } from "../entities/deal.entity";
import { DealSigner } from "../entities/deal-signer.entity";
import {
  DealEventActor,
  DealEventKind,
  DealSignatureMethod,
  DealSignerRole,
  DealSignerStatus,
  DealStage,
  DealStatus,
} from "../enums/deal.enum";
import { DealGovbrCopyDto, DealSignDto } from "../dtos/deal.dto";
import { RequestEvidence } from "../helpers/deal-upload.helper";
import { DealMapper } from "../mappers/deal.mapper";
import {
  contractSignedMail,
  govbrCopySubmittedMail,
} from "../mails/deal.mails";
import { BrokerMailService } from "../../notifications/services/broker-mail.service";
import { DealActivityService } from "./deal-activity.service";
import { DealService } from "./deal.service";

const CLEARED_SIGNATURE = {
  status: DealSignerStatus.PENDING,
  method: null,
  signedAt: null,
  signedName: null,
  signedDocumentNumber: null,
  signedIp: null,
  signedUserAgent: null,
  signedContractSha256: null,
  signedDocumentId: null,
};

const firstNameOf = (name: string) => name.trim().split(/\s+/)[0];

/** Who shows on the history when a signer acts from their own link. */
const signerActorOf = (signer: DealSigner) =>
  signer.role === DealSignerRole.PARTNER
    ? DealEventActor.PARTNER
    : DealEventActor.CUSTOMER;

/**
 * Contract signatures. Three ways in: accepting on our signing page (simple
 * electronic signature, law 14.063/2020, with name, CPF, IP, device, time
 * and the contract fingerprint stored), uploading a copy signed on gov.br,
 * or the broker marking a paper signature.
 */
@Injectable()
export class DealSignatureService {
  constructor(
    @InjectRepository(DealSigner)
    private readonly signerRepository: Repository<DealSigner>,
    @InjectRepository(Deal)
    private readonly dealRepository: Repository<Deal>,
    private readonly documentService: DocumentService,
    private readonly dealService: DealService,
    private readonly activityService: DealActivityService,
    private readonly brokerMailService: BrokerMailService,
  ) {}

  async getSigningView(token: string) {
    const signer = await this.findSignerByTokenOrThrow(token);
    const deal = signer.deal;
    const contractDocument = deal.contractDocumentId
      ? await this.documentService
          .findOneOrThrow(deal.userId, deal.contractDocumentId)
          .catch(() => null)
      : null;

    return {
      signer: {
        name: signer.name,
        role: signer.role,
        status: signer.status,
        method: signer.method,
        signedAt: signer.signedAt,
        signedName: signer.signedName,
        signedContractSha256: signer.signedContractSha256,
      },
      dealStatus: deal.status,
      broker: { name: deal.user.name, profileImage: deal.user.profileImage },
      property: DealMapper.toProperty(deal.property),
      contract: contractDocument
        ? {
            document: DocumentMapper.toDto(contractDocument),
            sha256: deal.contractSha256,
            uploadedAt: deal.contractUploadedAt,
          }
        : null,
    };
  }

  async getContractUrl(token: string) {
    const signer = await this.findSignerByTokenOrThrow(token);
    const deal = signer.deal;
    if (!deal.contractDocumentId) {
      throw new NotFoundException("O contrato ainda não foi enviado.");
    }
    const document = await this.documentService.findOneOrThrow(
      deal.userId,
      deal.contractDocumentId,
    );
    return this.documentService.getPresignedUrlForDocument(document);
  }

  async signElectronically(
    token: string,
    dto: DealSignDto,
    evidence: RequestEvidence,
  ) {
    const signer = await this.findSignerByTokenOrThrow(token);
    const deal = this.assertCanSign(signer, dto.contractSha256);

    // Only a pending signature turns into a signed one, so two requests
    // racing on the same link can never overwrite the first evidence.
    await this.claimPendingSignature(signer.id, {
      status: DealSignerStatus.SIGNED,
      method: DealSignatureMethod.ELECTRONIC,
      signedAt: new Date(),
      signedName: dto.fullName,
      signedDocumentNumber: dto.documentNumber,
      signedIp: evidence.ip,
      signedUserAgent: evidence.userAgent,
      signedContractSha256: deal.contractSha256,
      signedDocumentId: null,
    });

    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.SIGNATURE,
      actor: signerActorOf(signer),
      message: `${firstNameOf(signer.name)} assinou o contrato`,
    });
    await this.completeContractWhenEveryoneSigned(deal);
    this.activityService.notifyBroker(deal.userId, deal.id);

    return this.getSigningView(token);
  }

  /** The copy signed on assinador.iti.br, checked by the broker afterwards. */
  async submitGovbrCopy(
    token: string,
    dto: DealGovbrCopyDto,
    file: Express.Multer.File,
    evidence: RequestEvidence,
  ) {
    const signer = await this.findSignerByTokenOrThrow(token);
    const deal = this.assertCanSign(signer, dto.contractSha256);

    const document = await this.documentService.upload(
      deal.userId,
      DocumentOwnerType.DEAL,
      deal.id,
      "deals",
      file,
    );

    await this.claimPendingSignature(signer.id, {
      status: DealSignerStatus.SUBMITTED,
      method: DealSignatureMethod.GOVBR,
      signedAt: new Date(),
      signedName: signer.name,
      signedIp: evidence.ip,
      signedUserAgent: evidence.userAgent,
      signedContractSha256: deal.contractSha256,
      signedDocumentId: document.id,
    });

    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.SIGNATURE,
      actor: signerActorOf(signer),
      message: `${firstNameOf(signer.name)} enviou o contrato assinado pelo gov.br`,
    });
    this.activityService.notifyBroker(deal.userId, deal.id);
    this.brokerMailService.notify(deal.userId, (context) =>
      govbrCopySubmittedMail(context, deal.id),
    );

    return this.getSigningView(token);
  }

  async reviewGovbrCopy(
    user: User,
    dealId: string,
    signerId: string,
    approved: boolean,
  ) {
    const signer = await this.findBrokerSignerOrThrow(user, dealId, signerId);
    if (signer.status !== DealSignerStatus.SUBMITTED) {
      throw new BadRequestException("Não há assinatura para conferir.");
    }

    await this.signerRepository.update(
      { id: signer.id },
      approved ? { status: DealSignerStatus.SIGNED } : CLEARED_SIGNATURE,
    );
    await this.activityService.record({
      dealId: signer.dealId,
      kind: DealEventKind.SIGNATURE,
      actor: DealEventActor.BROKER,
      message: approved
        ? `A assinatura gov.br de ${firstNameOf(signer.name)} foi conferida`
        : `A assinatura de ${firstNameOf(signer.name)} precisa ser refeita`,
    });
    if (approved) await this.completeContractWhenEveryoneSigned(signer.deal);

    return this.dealService.findOne(user, dealId);
  }

  /** Signed on paper, in front of the broker. */
  async markSignedManually(user: User, dealId: string, signerId: string) {
    const signer = await this.findBrokerSignerOrThrow(user, dealId, signerId);
    if (signer.status === DealSignerStatus.SIGNED) {
      return this.dealService.findOne(user, dealId);
    }

    await this.signerRepository.update(
      { id: signer.id },
      {
        ...CLEARED_SIGNATURE,
        status: DealSignerStatus.SIGNED,
        method: DealSignatureMethod.MANUAL,
        signedAt: new Date(),
        signedName: signer.name,
        signedContractSha256: signer.deal.contractSha256,
      },
    );
    await this.activityService.record({
      dealId: signer.dealId,
      kind: DealEventKind.SIGNATURE,
      actor: DealEventActor.BROKER,
      message: `${firstNameOf(signer.name)} assinou o contrato em papel`,
    });
    await this.completeContractWhenEveryoneSigned(signer.deal);

    return this.dealService.findOne(user, dealId);
  }

  async resetSignature(user: User, dealId: string, signerId: string) {
    const signer = await this.findBrokerSignerOrThrow(user, dealId, signerId);
    await this.signerRepository.update({ id: signer.id }, CLEARED_SIGNATURE);
    return this.dealService.findOne(user, dealId);
  }

  /** Last signature in, the sale moves on to payment and registry. */
  private async completeContractWhenEveryoneSigned(deal: Deal) {
    const signers = await this.signerRepository.find({
      where: { dealId: deal.id, active: true },
    });
    const everyoneSigned =
      signers.length > 0 &&
      signers.every((signer) => signer.status === DealSignerStatus.SIGNED);
    if (!everyoneSigned) return;

    await this.activityService.record({
      dealId: deal.id,
      kind: DealEventKind.CONTRACT,
      actor: DealEventActor.SYSTEM,
      message: "Contrato assinado por todos! 🎉",
    });
    this.brokerMailService.notify(deal.userId, (context) =>
      contractSignedMail(context, deal.id),
    );

    const current = await this.dealRepository.findOneBy({ id: deal.id });
    if (current?.stage === DealStage.CONTRACT) {
      await this.dealService.moveToStage(
        current,
        DealStage.CLOSING,
        DealEventActor.SYSTEM,
      );
    }
  }

  /** Writes the signature only if it is still pending, or refuses. */
  private async claimPendingSignature(
    signerId: string,
    changes: Partial<DealSigner>,
  ) {
    const result = await this.signerRepository.update(
      { id: signerId, status: DealSignerStatus.PENDING },
      changes,
    );
    if (!result.affected) {
      throw new ConflictException("Este contrato já foi assinado por você.");
    }
  }

  /**
   * The signer must be signing the version in force: a contract replaced
   * after the page was opened is refused, never signed in their name.
   */
  private assertCanSign(signer: DealSigner, contractSha256: string) {
    const deal = signer.deal;
    if (deal.status !== DealStatus.OPEN) {
      throw new BadRequestException("Esta negociação está encerrada.");
    }
    if (!deal.contractDocumentId || !deal.contractSha256) {
      throw new BadRequestException("O contrato ainda não foi enviado.");
    }
    if (signer.status !== DealSignerStatus.PENDING) {
      throw new ConflictException("Este contrato já foi assinado por você.");
    }
    if (contractSha256 !== deal.contractSha256) {
      throw new ConflictException(
        "O contrato mudou depois que você abriu a página. Recarregue, leia a nova versão e assine de novo.",
      );
    }
    return deal;
  }

  private async findSignerByTokenOrThrow(token: string) {
    const signer = await this.signerRepository.findOne({
      where: { signingToken: token, active: true, deal: { active: true } },
      relations: { deal: { user: true, property: true } },
    });
    if (!signer) throw new NotFoundException("Link de assinatura inválido.");
    return signer;
  }

  private async findBrokerSignerOrThrow(
    user: User,
    dealId: string,
    signerId: string,
  ) {
    const signer = await this.signerRepository.findOne({
      where: {
        id: signerId,
        dealId,
        active: true,
        deal: { userId: user.id, active: true },
      },
      relations: { deal: true },
    });
    if (!signer) throw new NotFoundException("Assinante não encontrado.");
    return signer;
  }
}
