import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { AdminOnly } from "../../admin/decorators/admin-only.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import {
  PortalAccountCodeDto,
  PortalAccountSaveDto,
} from "../dtos/property-hunt.dto";
import { PortalKey } from "../enums/property-hunt.enum";
import { PortalAccountService } from "../services/portal-account.service";

const portalPipe = new ParseEnumPipe(PortalKey);

/**
 * The platform's logins on the listing portals. Every hunt browses with
 * them, so the brokers never connect anything. Managed only from the
 * backoffice, like the credit grants.
 */
@Controller("portal-accounts")
export class PortalAccountController {
  constructor(private readonly accountService: PortalAccountService) {}

  /** Which portals the hunts browse signed in, shown to the brokers. */
  @Get()
  @UseGuards(JwtGuard)
  readiness() {
    return this.accountService.readiness();
  }

  @Get("platform")
  @AdminOnly()
  list() {
    return this.accountService.list();
  }

  @Put("platform/:portal")
  @AdminOnly()
  connect(
    @Param("portal", portalPipe) portal: PortalKey,
    @Body() dto: PortalAccountSaveDto,
  ) {
    return this.accountService.connect(portal, dto);
  }

  @Post("platform/:portal/code")
  @AdminOnly()
  code(
    @Param("portal", portalPipe) portal: PortalKey,
    @Body() dto: PortalAccountCodeDto,
  ) {
    return this.accountService.submitCode(portal, dto.code);
  }

  @Post("platform/:portal/check")
  @AdminOnly()
  check(@Param("portal", portalPipe) portal: PortalKey) {
    return this.accountService.check(portal);
  }

  @Delete("platform/:portal")
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("portal", portalPipe) portal: PortalKey) {
    await this.accountService.remove(portal);
  }
}
