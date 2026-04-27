import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { DocumentService } from "../../documents/services/document.service";
import { DocumentOwnerType } from "../../documents/entities/document.entity";
import { DocumentMapper } from "../../documents/mappers/document.mapper";
import { DocumentRenameDto } from "../../documents/dtos/document.dto";
import { CustomerService } from "../services/customer.service";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

@Controller("customers/:customerId/documents")
@UseGuards(JwtGuard)
export class CustomerDocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly customerService: CustomerService,
  ) {}

  @Get()
  async findAll(
    @GetUser() user: User,
    @Param("customerId") customerId: string,
  ) {
    await this.customerService.findOne(user, customerId);
    const documents = await this.documentService.findAllByOwner(
      user.id,
      DocumentOwnerType.CUSTOMER,
      customerId,
    );
    return documents.map(DocumentMapper.toDto);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              "Tipo de arquivo não permitido. Tipos aceitos: PDF, imagens, Word, Excel, texto.",
            ),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @GetUser() user: User,
    @Param("customerId") customerId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("Arquivo é obrigatório.");
    }
    await this.customerService.findOne(user, customerId);
    const document = await this.documentService.upload(
      user.id,
      DocumentOwnerType.CUSTOMER,
      customerId,
      "customers",
      file,
    );
    return DocumentMapper.toDto(document);
  }

  @Get(":documentId/url")
  async getPresignedUrl(
    @GetUser() user: User,
    @Param("documentId") documentId: string,
  ) {
    return this.documentService.getPresignedUrl(user.id, documentId);
  }

  @Patch(":documentId")
  async rename(
    @GetUser() user: User,
    @Param("documentId") documentId: string,
    @Body() dto: DocumentRenameDto,
  ) {
    const document = await this.documentService.rename(
      user.id,
      documentId,
      dto.displayName,
    );
    return DocumentMapper.toDto(document);
  }

  @Delete(":documentId")
  async remove(
    @GetUser() user: User,
    @Param("documentId") documentId: string,
  ) {
    await this.documentService.remove(user.id, documentId);
  }
}
