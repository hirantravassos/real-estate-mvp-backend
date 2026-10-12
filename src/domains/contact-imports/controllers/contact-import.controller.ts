import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  ContactAnalysisDto,
  ContactImportDto,
  GoogleContactsDto,
} from "../dtos/contact-import.dto";
import { ContactAiAnalysisService } from "../services/contact-ai-analysis.service";
import { ContactImportService } from "../services/contact-import.service";
import { PlanLimit } from "../../subscriptions/decorators/subscription.decorator";
import { PlanLimitResource } from "../../subscriptions/enums/subscription.enum";

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

  @Post("google")
  google(@GetUser() user: User, @Body() dto: GoogleContactsDto) {
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
