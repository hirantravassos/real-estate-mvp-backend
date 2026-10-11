import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { portalsConfig } from "../../../config/portals.config";
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
 * them, so the brokers never connect anything. Managed only with the
 * CREDITS_ADMIN_KEY, like the credit grants.
 */
@Controller("portal-accounts")
export class PortalAccountController {
  constructor(
    @Inject(portalsConfig.KEY)
    private readonly configuration: ConfigType<typeof portalsConfig>,
    private readonly accountService: PortalAccountService,
  ) {}

  /** Which portals the hunts browse signed in, shown to the brokers. */
  @Get()
  @UseGuards(JwtGuard)
  readiness() {
    return this.accountService.readiness();
  }

  @Get("platform")
  list(@Headers("x-admin-key") adminKey: string | undefined) {
    this.ensureAdmin(adminKey);
    return this.accountService.list();
  }

  @Put("platform/:portal")
  connect(
    @Headers("x-admin-key") adminKey: string | undefined,
    @Param("portal", portalPipe) portal: PortalKey,
    @Body() dto: PortalAccountSaveDto,
  ) {
    this.ensureAdmin(adminKey);
    return this.accountService.connect(portal, dto);
  }

  @Post("platform/:portal/code")
  code(
    @Headers("x-admin-key") adminKey: string | undefined,
    @Param("portal", portalPipe) portal: PortalKey,
    @Body() dto: PortalAccountCodeDto,
  ) {
    this.ensureAdmin(adminKey);
    return this.accountService.submitCode(portal, dto.code);
  }

  @Post("platform/:portal/check")
  check(
    @Headers("x-admin-key") adminKey: string | undefined,
    @Param("portal", portalPipe) portal: PortalKey,
  ) {
    this.ensureAdmin(adminKey);
    return this.accountService.check(portal);
  }

  @Delete("platform/:portal")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Headers("x-admin-key") adminKey: string | undefined,
    @Param("portal", portalPipe) portal: PortalKey,
  ) {
    this.ensureAdmin(adminKey);
    await this.accountService.remove(portal);
  }

  private ensureAdmin(adminKey: string | undefined) {
    const expected = this.configuration.adminKey;
    const valid =
      Boolean(expected && adminKey) &&
      Buffer.from(expected).length === Buffer.from(adminKey ?? "").length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(adminKey ?? ""));
    if (!valid)
      throw new ForbiddenException("Chave de administrador inválida.");
  }
}
