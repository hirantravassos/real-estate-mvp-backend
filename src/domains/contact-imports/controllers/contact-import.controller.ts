import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  ContactAddDto,
  ContactAnalysisDto,
  ContactDirectoryFilterDto,
  ContactImportDto,
  GoogleContactsDto,
} from "../dtos/contact-import.dto";
import { ContactAiAnalysisService } from "../services/contact-ai-analysis.service";
import { ContactImportService } from "../services/contact-import.service";
import { PlanLimit } from "../../subscriptions/decorators/subscription.decorator";
import { PlanLimitResource } from "../../subscriptions/enums/subscription.enum";

/** Google address book import, off for now; the frontend hides it too. */
const GOOGLE_CONTACTS_IMPORT_ENABLED = false;

/** Brings the broker's existing contacts in, the first step of onboarding. */
@Controller("contact-imports")
@UseGuards(JwtGuard)
export class ContactImportController {
  constructor(
    private readonly contactImportService: ContactImportService,
    private readonly contactAiAnalysisService: ContactAiAnalysisService,
  ) {}

  @Get("whatsapp")
  whatsapp(@GetUser() user: User) {
    return this.contactImportService.whatsappCandidates(user);
  }

  /** Searches the WhatsApp contacts and open chats, imported or not. */
  @Get("directory")
  directory(@GetUser() user: User, @Query() filter: ContactDirectoryFilterDto) {
    return this.contactImportService.searchDirectory(user, filter.search);
  }

  /** Saves one contact as a customer, or returns the one already saved. */
  @Post("contact")
  @PlanLimit(PlanLimitResource.CUSTOMERS)
  addContact(@GetUser() user: User, @Body() dto: ContactAddDto) {
    return this.contactImportService.addContact(user, dto);
  }

  @Post("google")
  google(@GetUser() user: User, @Body() dto: GoogleContactsDto) {
    if (!GOOGLE_CONTACTS_IMPORT_ENABLED) {
      throw new ForbiddenException(
        "A importação da agenda do Google está desativada.",
      );
    }
    return this.contactImportService.googleCandidates(user, dto.accessToken);
  }

  @Post("ai-analysis")
  analyze(@GetUser() user: User, @Body() dto: ContactAnalysisDto) {
    return this.contactAiAnalysisService.analyze(user, dto);
  }

  @Post()
  @PlanLimit(PlanLimitResource.CUSTOMERS, { countBodyList: "contacts" })
  import(@GetUser() user: User, @Body() dto: ContactImportDto) {
    return this.contactImportService.importContacts(user, dto);
  }
}
