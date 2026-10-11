import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  PropertyDocumentLookupRunDto,
  PropertyLegalProfileSaveDto,
} from "../dtos/document-lookup.dto";
import { DocumentLookupService } from "../services/document-lookup.service";

/** Public certificates of a property and its owners, fetched or guided. */
@Controller("properties/:propertyId/document-lookups")
@UseGuards(JwtGuard)
export class DocumentLookupController {
  constructor(private readonly documentLookupService: DocumentLookupService) {}

  @Get()
  overview(@GetUser() user: User, @Param("propertyId") propertyId: string) {
    return this.documentLookupService.overview(user, propertyId);
  }

  @Put("profile")
  saveProfile(
    @GetUser() user: User,
    @Param("propertyId") propertyId: string,
    @Body() dto: PropertyLegalProfileSaveDto,
  ) {
    return this.documentLookupService.saveProfile(user, propertyId, dto);
  }

  @Post("profile/read-documents")
  readDocuments(
    @GetUser() user: User,
    @Param("propertyId") propertyId: string,
  ) {
    return this.documentLookupService.readDocuments(user, propertyId);
  }

  @Post(":lookupKey/run")
  run(
    @GetUser() user: User,
    @Param("propertyId") propertyId: string,
    @Param("lookupKey") lookupKey: string,
    @Body() dto: PropertyDocumentLookupRunDto,
  ) {
    return this.documentLookupService.run(user, propertyId, lookupKey, dto);
  }
}
