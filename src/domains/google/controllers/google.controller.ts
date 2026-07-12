import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { UserGuard } from "../../auth/guards/user.guard";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { GoogleService } from "../services/google.service";
import { AuthorizationCodeDto } from "../dtos/authorization-code.dto";

@Controller("google")
@UseGuards(UserGuard)
export class GoogleController {
  constructor(private readonly googleService: GoogleService) {}

  @Post("contacts/connect")
  connectContacts(
    @GetUser("id") userId: string,
    @Body() dto: AuthorizationCodeDto,
  ) {
    return this.googleService.connectContacts(userId, dto.authenticationCode);
  }

  @Post("contacts/disconnect")
  disconnectContacts(@GetUser("id") userId: string) {
    return this.googleService.disconnectContacts(userId);
  }

  @Get("contacts/status")
  getConnectionStatus(@GetUser("id") userId: string) {
    return this.googleService.getConnectionStatus(userId);
  }

  @Get("contacts")
  getContacts(@GetUser("id") userId: string) {
    return this.googleService.getContacts(userId);
  }
}
