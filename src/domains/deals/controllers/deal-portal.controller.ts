import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { DealPortalService } from "../services/deal-portal.service";
import { DealSignatureService } from "../services/deal-signature.service";
import { DealPartnerService } from "../services/deal-partner.service";
import { DealSignDto } from "../dtos/deal.dto";
import {
  dealContractUploadOptions,
  dealDocumentUploadOptions,
  readRequestEvidence,
  requireFile,
} from "../helpers/deal-upload.helper";

/**
 * Public routes for the customer area, the partner area and the signing page. No login, the
 * long random token in the link is the key.
 */
@Controller()
export class DealPortalController {
  constructor(
    private readonly portalService: DealPortalService,
    private readonly signatureService: DealSignatureService,
    private readonly partnerService: DealPartnerService,
  ) {}

  @Get("portal/:token")
  getPortal(@Param("token") token: string) {
    return this.portalService.getPortal(token);
  }

  @Post("portal/:token/checklist/:itemId/documents")
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

  @Get("portal/:token/documents/:documentId/url")
  getDocumentUrl(
    @Param("token") token: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
  ) {
    return this.portalService.getDocumentUrl(token, documentId);
  }

  @Get("partners/:token")
  getPartnerArea(@Param("token") token: string) {
    return this.partnerService.getArea(token);
  }

  @Post("partners/:token/checklist/:itemId/documents")
  @UseInterceptors(FileInterceptor("file", dealDocumentUploadOptions))
  uploadPartnerChecklistDocument(
    @Param("token") token: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.partnerService.uploadChecklistDocument(
      token,
      itemId,
      requireFile(file),
    );
  }

  @Get("partners/:token/documents/:documentId/url")
  getPartnerDocumentUrl(
    @Param("token") token: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
  ) {
    return this.partnerService.getDocumentUrl(token, documentId);
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
  @UseInterceptors(FileInterceptor("file", dealContractUploadOptions))
  submitGovbrCopy(
    @Param("token") token: string,
    @Req() request: Request,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.signatureService.submitGovbrCopy(
      token,
      requireFile(file),
      readRequestEvidence(request),
    );
  }
}
