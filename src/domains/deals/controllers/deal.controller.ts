import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { DealService } from "../services/deal.service";
import { DealSignatureService } from "../services/deal-signature.service";
import { DealPartnerService } from "../services/deal-partner.service";
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
  DealPartnerCreateDto,
  DealPartnerUpdateDto,
  DealPortalDto,
  DealSignerCreateDto,
  DealSignerReviewDto,
  DealStageDto,
  DealUpdateDto,
} from "../dtos/deal.dto";
import {
  dealContractUploadOptions,
  dealDocumentUploadOptions,
  requireFile,
} from "../helpers/deal-upload.helper";

/** The broker's side of the closing room. */
@Controller("deals")
@UseGuards(JwtGuard)
export class DealController {
  constructor(
    private readonly dealService: DealService,
    private readonly signatureService: DealSignatureService,
    private readonly partnerService: DealPartnerService,
  ) {}

  @Get()
  findAll(@GetUser() user: User, @Query() filter: DealFilterDto) {
    return this.dealService.findAll(user, filter);
  }

  @Get("customer/:customerId")
  findAllByCustomer(
    @GetUser() user: User,
    @Param("customerId", ParseUUIDPipe) customerId: string,
  ) {
    return this.dealService.findAllByCustomer(user, customerId);
  }

  @Post()
  create(@GetUser() user: User, @Body() dto: DealCreateDto) {
    return this.dealService.create(user, dto);
  }

  @Get(":id")
  findOne(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.dealService.findOne(user, id);
  }

  @Patch(":id")
  update(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealUpdateDto,
  ) {
    return this.dealService.update(user, id, dto);
  }

  @Delete(":id")
  remove(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.dealService.remove(user, id);
  }

  @Post(":id/stage")
  changeStage(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealStageDto,
  ) {
    return this.dealService.changeStage(user, id, dto.stage);
  }

  @Post(":id/win")
  win(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.dealService.win(user, id);
  }

  @Post(":id/cancel")
  cancel(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealCancelDto,
  ) {
    return this.dealService.cancel(user, id, dto);
  }

  @Post(":id/reopen")
  reopen(@GetUser() user: User, @Param("id", ParseUUIDPipe) id: string) {
    return this.dealService.reopen(user, id);
  }

  @Patch(":id/portal")
  setPortal(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealPortalDto,
  ) {
    return this.dealService.setPortalEnabled(user, id, dto.enabled);
  }

  @Post(":id/portal/regenerate")
  regeneratePortal(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.dealService.regeneratePortalToken(user, id);
  }

  @Post(":id/messages")
  addMessage(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealMessageDto,
  ) {
    return this.dealService.addMessage(user, id, dto);
  }

  @Post(":id/checklist")
  addChecklistItem(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealChecklistItemCreateDto,
  ) {
    return this.dealService.addChecklistItem(user, id, dto);
  }

  @Patch(":id/checklist/:itemId")
  updateChecklistItem(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() dto: DealChecklistItemUpdateDto,
  ) {
    return this.dealService.updateChecklistItem(user, id, itemId, dto);
  }

  @Post(":id/checklist/:itemId/review")
  reviewChecklistItem(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @Body() dto: DealChecklistReviewDto,
  ) {
    return this.dealService.reviewChecklistItem(user, id, itemId, dto);
  }

  @Delete(":id/checklist/:itemId")
  removeChecklistItem(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
  ) {
    return this.dealService.removeChecklistItem(user, id, itemId);
  }

  @Post(":id/checklist/:itemId/documents")
  @UseInterceptors(FileInterceptor("file", dealDocumentUploadOptions))
  uploadChecklistDocument(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("itemId", ParseUUIDPipe) itemId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.dealService.uploadChecklistDocument(
      user,
      id,
      itemId,
      requireFile(file),
    );
  }

  @Get(":id/documents/:documentId/url")
  getDocumentUrl(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
  ) {
    return this.dealService.getDocumentUrl(user, id, documentId);
  }

  @Delete(":id/documents/:documentId")
  removeDocument(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
  ) {
    return this.dealService.removeDocument(user, id, documentId);
  }

  @Post(":id/contract")
  @UseInterceptors(FileInterceptor("file", dealContractUploadOptions))
  uploadContract(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.dealService.uploadContract(user, id, requireFile(file));
  }

  @Post(":id/signers")
  addSigner(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealSignerCreateDto,
  ) {
    return this.dealService.addSigner(user, id, dto);
  }

  @Delete(":id/signers/:signerId")
  removeSigner(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("signerId", ParseUUIDPipe) signerId: string,
  ) {
    return this.dealService.removeSigner(user, id, signerId);
  }

  @Post(":id/signers/:signerId/review")
  reviewSignature(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("signerId", ParseUUIDPipe) signerId: string,
    @Body() dto: DealSignerReviewDto,
  ) {
    return this.signatureService.reviewGovbrCopy(
      user,
      id,
      signerId,
      dto.approved,
    );
  }

  @Post(":id/signers/:signerId/mark-signed")
  markSigned(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("signerId", ParseUUIDPipe) signerId: string,
  ) {
    return this.signatureService.markSignedManually(user, id, signerId);
  }

  @Post(":id/signers/:signerId/reset")
  resetSignature(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("signerId", ParseUUIDPipe) signerId: string,
  ) {
    return this.signatureService.resetSignature(user, id, signerId);
  }

  @Post(":id/partners")
  addPartner(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealPartnerCreateDto,
  ) {
    return this.partnerService.addPartner(user, id, dto);
  }

  @Patch(":id/partners/:partnerId")
  updatePartner(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("partnerId", ParseUUIDPipe) partnerId: string,
    @Body() dto: DealPartnerUpdateDto,
  ) {
    return this.partnerService.updatePartner(user, id, partnerId, dto);
  }

  @Delete(":id/partners/:partnerId")
  removePartner(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("partnerId", ParseUUIDPipe) partnerId: string,
  ) {
    return this.partnerService.removePartner(user, id, partnerId);
  }

  @Post(":id/partners/:partnerId/regenerate")
  regeneratePartnerLink(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("partnerId", ParseUUIDPipe) partnerId: string,
  ) {
    return this.partnerService.regenerateToken(user, id, partnerId);
  }

  @Post(":id/milestones")
  addMilestone(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DealMilestoneCreateDto,
  ) {
    return this.dealService.addMilestone(user, id, dto);
  }

  @Patch(":id/milestones/:milestoneId")
  updateMilestone(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("milestoneId", ParseUUIDPipe) milestoneId: string,
    @Body() dto: DealMilestoneUpdateDto,
  ) {
    return this.dealService.updateMilestone(user, id, milestoneId, dto);
  }

  @Delete(":id/milestones/:milestoneId")
  removeMilestone(
    @GetUser() user: User,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("milestoneId", ParseUUIDPipe) milestoneId: string,
  ) {
    return this.dealService.removeMilestone(user, id, milestoneId);
  }
}
