import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ProposalService } from "../services/proposal.service";
import { ProposalDocumentService } from "../services/proposal-document.service";
import { ProposalPartyRole } from "../entities/proposal-party.entity";
import { ProposalDocumentCategory } from "../entities/proposal-document.entity";
import { ProposalMapper } from "../mappers/proposal.mapper";

class PublicAccessDto {
  @IsString()
  cpfCnpj: string;
}

class PublicUploadDto {
  @IsString()
  cpfCnpj: string;

  @IsEnum(ProposalDocumentCategory)
  category: ProposalDocumentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;
}

class PublicDeleteDto {
  @IsString()
  cpfCnpj: string;
}

class PublicUrlDto {
  @IsString()
  cpfCnpj: string;
}

@Controller("proposals/public")
@UseGuards(ThrottlerGuard)
export class ProposalPublicController {
  constructor(
    private readonly proposalService: ProposalService,
    private readonly proposalDocumentService: ProposalDocumentService,
  ) {}

  @Post(":token/access")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async access(
    @Param("token") token: string,
    @Body() dto: PublicAccessDto,
  ) {
    const proposal = await this.proposalService.findOneByToken(token);
    const normalized = dto.cpfCnpj.replace(/\D/g, "");

    const matched = (proposal.parties ?? []).find(
      (p) => p.cpfCnpj === normalized && p.active,
    );

    if (!matched) {
      throw new NotFoundException("CPF/CNPJ não encontrado nesta proposta.");
    }

    return ProposalMapper.toPublicDto(proposal, matched);
  }

  @Post(":token/documents")
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_req, _file, cb) => cb(null, true),
    }),
  )
  async uploadDocument(
    @Param("token") token: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: PublicUploadDto,
  ) {
    if (!file) throw new BadRequestException("Arquivo é obrigatório.");

    const proposal = await this.proposalService.findOneByToken(token);
    const normalized = dto.cpfCnpj.replace(/\D/g, "");

    const matched = (proposal.parties ?? []).find(
      (p) => p.cpfCnpj === normalized && p.active,
    );

    if (!matched) {
      throw new NotFoundException("CPF/CNPJ não encontrado nesta proposta.");
    }

    const allowedCategories =
      matched.role === ProposalPartyRole.BUYER || matched.role === ProposalPartyRole.SELLER
        ? [ProposalDocumentCategory.PERSONAL, ProposalDocumentCategory.COMPANY]
        : [];

    if (!allowedCategories.includes(dto.category)) {
      throw new BadRequestException("Categoria de documento não permitida para este acesso.");
    }

    return this.proposalDocumentService.upload(
      proposal.userId,
      proposal.id,
      { category: dto.category, displayName: dto.displayName, partyId: matched.id },
      file,
    );
  }

  @Post(":token/documents/:documentId/url")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getDocumentUrl(
    @Param("token") token: string,
    @Param("documentId") documentId: string,
    @Body() dto: PublicUrlDto,
  ) {
    const proposal = await this.proposalService.findOneByToken(token);
    const normalized = dto.cpfCnpj.replace(/\D/g, "");

    const matched = (proposal.parties ?? []).find(
      (p) => p.cpfCnpj === normalized && p.active,
    );

    if (!matched) {
      throw new NotFoundException("CPF/CNPJ não encontrado nesta proposta.");
    }

    return this.proposalDocumentService.getPresignedUrlPublic(proposal.id, documentId, matched.id);
  }

  @Delete(":token/documents/:documentId")
  @Throttle({ default: { limit: 3, ttl: 600_000 } })
  async removeDocument(
    @Param("token") token: string,
    @Param("documentId") documentId: string,
    @Body() dto: PublicDeleteDto,
  ) {
    const proposal = await this.proposalService.findOneByToken(token);
    const normalized = dto.cpfCnpj.replace(/\D/g, "");

    const matched = (proposal.parties ?? []).find(
      (p) => p.cpfCnpj === normalized && p.active,
    );

    if (!matched) {
      throw new NotFoundException("CPF/CNPJ não encontrado nesta proposta.");
    }

    await this.proposalDocumentService.removePublic(proposal.id, documentId, matched.id);
  }
}
