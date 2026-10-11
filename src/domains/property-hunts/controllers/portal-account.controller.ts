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
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { User } from "../../users/entities/user.entity";
import {
  PortalAccountCodeDto,
  PortalAccountSaveDto,
} from "../dtos/property-hunt.dto";
import { PortalKey } from "../enums/property-hunt.enum";
import { PortalAccountService } from "../services/portal-account.service";

const portalPipe = new ParseEnumPipe(PortalKey);

/** The broker's logins on the listing portals, and the platform's shared ones. */
@Controller("portal-accounts")
export class PortalAccountController {
  constructor(
    @Inject(portalsConfig.KEY)
    private readonly configuration: ConfigType<typeof portalsConfig>,
    private readonly accountService: PortalAccountService,
  ) {}

  @Get()
  @UseGuards(JwtGuard)
  list(@GetUser() user: User) {
    return this.accountService.listForUser(user);
  }

  @Put(":portal")
  @UseGuards(JwtGuard)
  connect(
    @GetUser() user: User,
    @Param("portal", portalPipe) portal: PortalKey,
    @Body() dto: PortalAccountSaveDto,
  ) {
    return this.accountService.connect(user.id, portal, dto);
  }

  @Post(":portal/code")
  @UseGuards(JwtGuard)
  code(
    @GetUser() user: User,
    @Param("portal", portalPipe) portal: PortalKey,
    @Body() dto: PortalAccountCodeDto,
  ) {
    return this.accountService.submitCode(user.id, portal, dto.code);
  }

  @Post(":portal/check")
  @UseGuards(JwtGuard)
  check(@GetUser() user: User, @Param("portal", portalPipe) portal: PortalKey) {
    return this.accountService.check(user.id, portal);
  }

  @Delete(":portal")
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @GetUser() user: User,
    @Param("portal", portalPipe) portal: PortalKey,
  ) {
    await this.accountService.remove(user.id, portal);
  }

  /** Platform accounts, protected by CREDITS_ADMIN_KEY like the credit grants. */
  @Get("platform")
  listPlatform(@Headers("x-admin-key") adminKey: string | undefined) {
    this.ensureAdmin(adminKey);
    return this.accountService.listPlatform();
  }

  @Put("platform/:portal")
  connectPlatform(
    @Headers("x-admin-key") adminKey: string | undefined,
    @Param("portal", portalPipe) portal: PortalKey,
    @Body() dto: PortalAccountSaveDto,
  ) {
    this.ensureAdmin(adminKey);
    return this.accountService.connect(null, portal, dto);
  }

  @Post("platform/:portal/code")
  codePlatform(
    @Headers("x-admin-key") adminKey: string | undefined,
    @Param("portal", portalPipe) portal: PortalKey,
    @Body() dto: PortalAccountCodeDto,
  ) {
    this.ensureAdmin(adminKey);
    return this.accountService.submitCode(null, portal, dto.code);
  }

  @Delete("platform/:portal")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePlatform(
    @Headers("x-admin-key") adminKey: string | undefined,
    @Param("portal", portalPipe) portal: PortalKey,
  ) {
    this.ensureAdmin(adminKey);
    await this.accountService.remove(null, portal);
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
