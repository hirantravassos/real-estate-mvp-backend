import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { ProposalService } from "../services/proposal.service";
import {
  ProposalDocumentService,
  RenameProposalDocumentDto,
  UploadProposalDocumentDto,
} from "../services/proposal-document.service";

@Controller("proposals/:proposalId/documents")
@UseGuards(JwtGuard)
export class ProposalDocumentController {
  constructor(
    private readonly proposalService: ProposalService,
    private readonly proposalDocumentService: ProposalDocumentService,
  ) {}

  @Get()
  async findAll(@GetUser() user: User, @Param("proposalId") proposalId: string) {
    await this.proposalService.findOne(user, proposalId);
    const docs = await this.proposalDocumentService.findAllByProposal(proposalId);
    return docs;
  }

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, _file, cb) => cb(null, true),
    }),
  )
  async upload(
    @GetUser() user: User,
    @Param("proposalId") proposalId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadProposalDocumentDto,
  ) {
    if (!file) throw new BadRequestException("Arquivo é obrigatório.");
    await this.proposalService.findOne(user, proposalId);
    return this.proposalDocumentService.upload(user.id, proposalId, dto, file);
  }

  @Get(":documentId/url")
  async getPresignedUrl(
    @GetUser() user: User,
    @Param("proposalId") proposalId: string,
    @Param("documentId") documentId: string,
  ) {
    await this.proposalService.findOne(user, proposalId);
    return this.proposalDocumentService.getPresignedUrl(user.id, proposalId, documentId);
  }

  @Patch(":documentId")
  async rename(
    @GetUser() user: User,
    @Param("proposalId") proposalId: string,
    @Param("documentId") documentId: string,
    @Body() dto: RenameProposalDocumentDto,
  ) {
    await this.proposalService.findOne(user, proposalId);
    return this.proposalDocumentService.rename(proposalId, documentId, dto.displayName);
  }

  @Delete(":documentId")
  async remove(
    @GetUser() user: User,
    @Param("proposalId") proposalId: string,
    @Param("documentId") documentId: string,
  ) {
    await this.proposalService.findOne(user, proposalId);
    await this.proposalDocumentService.remove(proposalId, documentId);
  }
}
