import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { DealPortalService } from "../services/deal-portal.service";
import { DealSignatureService } from "../services/deal-signature.service";
import { DealPartnerAreaService } from "../services/deal-partner-area.service";
import {
  DealGovbrCopyDto,
  DealPartnerChecklistItemDto,
  DealPartnerVerifyDto,
  DealSignDto,
} from "../dtos/deal.dto";
import { CustomerAvatarDto } from "../../customers/dtos/customer-avatar.dto";
import {
  dealContractUploadOptions,
  dealDocumentUploadOptions,
  readRequestEvidence,
  requireFile,
} from "../helpers/deal-upload.helper";

/** Uploads and signatures per address and minute on these public links. */
const PUBLIC_WRITES_PER_MINUTE = 10;
const publicWriteLimit = {
  default: { limit: PUBLIC_WRITES_PER_MINUTE, ttl: 60_000 },
};

/** Number checks per address and minute, the partner lock covers the rest. */
const verifyLimit = { default: { limit: 5, ttl: 60_000 } };

/** Where the partner area session travels, never in the URL. */
const PARTNER_SESSION_HEADER = "x-partner-session";

/**
 * Public routes for the customer area, the partner area and the signing page. No login, the
 * long random token in the link is the key. The global throttler covers the
 * reads, the writes get a tighter limit.
 */
@Controller()
export class DealPortalController {
  constructor(
    private readonly portalService: DealPortalService,
    private readonly signatureService: DealSignatureService,
    private readonly partnerAreaService: DealPartnerAreaService,
  ) {}

  @Get("portal/:token")
  getPortal(@Param("token") token: string) {
    return this.portalService.getPortal(token);
  }

  @Post("portal/:token/checklist/:itemId/documents")
  @Throttle(publicWriteLimit)
  @UseInterceptors(FileInterceptor("file", dealDocumentUploadOptions))
  uploadChecklistDocument(
    @Param("token") token: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.portalService.uploadChecklistDocument(
      token,
      itemId,
      requireFile(file),
    );
  }

  @Put("portal/:token/avatar")
  @Throttle(publicWriteLimit)
  updateCustomerAvatar(
    @Param("token") token: string,
    @Body() dto: CustomerAvatarDto,
  ) {
    return this.portalService.updateCustomerAvatar(token, dto);
  }

  @Get("portal/:token/documents/:documentId/url")
  getDocumentUrl(
    @Param("token") token: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
  ) {
    return this.portalService.getDocumentUrl(token, documentId);
  }

  /** Before the number is confirmed the link only greets the partner. */
  @Get("partners/:token/gate")
  getPartnerGate(@Param("token") token: string) {
    return this.partnerAreaService.getGate(token);
  }

  /** Opens the area on this device when the number is the saved one. */
  @Post("partners/:token/verify")
  @Throttle(verifyLimit)
  verifyPartner(
    @Param("token") token: string,
    @Body() dto: DealPartnerVerifyDto,
  ) {
    return this.partnerAreaService.verify(token, dto.phone);
  }

  @Get("partners/:token")
  getPartnerArea(
    @Param("token") token: string,
    @Headers(PARTNER_SESSION_HEADER) session?: string,
  ) {
    return this.partnerAreaService.getArea(token, session);
  }

  @Post("partners/:token/checklist")
  @Throttle(publicWriteLimit)
  addPartnerChecklistItem(
    @Param("token") token: string,
    @Body() dto: DealPartnerChecklistItemDto,
    @Headers(PARTNER_SESSION_HEADER) session?: string,
  ) {
    return this.partnerAreaService.addChecklistItem(token, session, dto);
  }

  @Post("partners/:token/checklist/:itemId/documents")
  @Throttle(publicWriteLimit)
  @UseInterceptors(FileInterceptor("file", dealDocumentUploadOptions))
  uploadPartnerChecklistDocument(
    @Param("token") token: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Headers(PARTNER_SESSION_HEADER) session?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.partnerAreaService.uploadChecklistDocument(
      token,
      session,
      itemId,
      requireFile(file),
    );
  }

  /** Only files the partner sent, never the broker's or another partner's. */
  @Delete("partners/:token/documents/:documentId")
  @Throttle(publicWriteLimit)
  removePartnerDocument(
    @Param("token") token: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Headers(PARTNER_SESSION_HEADER) session?: string,
  ) {
    return this.partnerAreaService.removeDocument(token, session, documentId);
  }

  @Get("partners/:token/documents/:documentId/url")
  getPartnerDocumentUrl(
    @Param("token") token: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @Headers(PARTNER_SESSION_HEADER) session?: string,
  ) {
    return this.partnerAreaService.getDocumentUrl(token, session, documentId);
  }

  @Get("signatures/:token")
  getSigningView(@Param("token") token: string) {
    return this.signatureService.getSigningView(token);
  }

  @Get("signatures/:token/contract")
  getContractUrl(@Param("token") token: string) {
    return this.signatureService.getContractUrl(token);
  }

  @Post("signatures/:token/sign")
  @Throttle(publicWriteLimit)
  sign(
    @Param("token") token: string,
    @Body() dto: DealSignDto,
    @Req() request: Request,
  ) {
    return this.signatureService.signElectronically(
      token,
      dto,
      readRequestEvidence(request),
    );
  }

  @Post("signatures/:token/govbr")
  @Throttle(publicWriteLimit)
  @UseInterceptors(FileInterceptor("file", dealContractUploadOptions))
  submitGovbrCopy(
    @Param("token") token: string,
    @Body() dto: DealGovbrCopyDto,
    @Req() request: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.signatureService.submitGovbrCopy(
      token,
      dto,
      requireFile(file),
      readRequestEvidence(request),
    );
  }
}
