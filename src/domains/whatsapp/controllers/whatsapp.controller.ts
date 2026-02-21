import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Delete,
  Body,
} from '@nestjs/common';
import { WhatsAppService } from '../whatsapp.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('initialize')
  async initialize(@Request() req: any) {
    await this.whatsappService.initializeSession(req.user.userId);
    return { message: 'Initialization started' };
  }

  @Get('status')
  async getStatus(@Request() req: any) {
    return this.whatsappService.getStatus(req.user.userId);
  }

  @Delete('logout')
  async logout(@Request() req: any) {
    await this.whatsappService.logout(req.user.userId);
    return { message: 'Logged out successfully' };
  }

  @Get('contacts-to-sync')
  async getContactsToSync(@Request() req: any) {
    return this.whatsappService.getContactsToSync(req.user.userId);
  }

  @Post('sync')
  async syncContacts(@Request() req: any, @Body('contacts') contacts: any[]) {
    return this.whatsappService.syncSelectedContacts(req.user.userId, contacts);
  }

  @Get('chats')
  async getChats(@Request() req: any) {
    return this.whatsappService.getConversations(req.user.userId);
  }
}
