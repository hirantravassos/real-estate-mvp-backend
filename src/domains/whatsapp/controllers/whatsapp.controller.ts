import {
  Controller,
  Delete,
  forwardRef,
  Get,
  Inject,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { existsSync } from "node:fs";
import { JwtGuard } from "../../auth/guards/jwt.guard";
import { WhatsappService } from "../services/whatsapp.service";
import { GetUser } from "../../../shared/decorators/get-user.decorator";
import { User } from "../../users/entities/user.entity";
import { WhatsappSocketService } from "../services/whatsapp-socket.service";
import { WhatsappMessageService } from "../services/whatsapp-message.service";
import { WhatsappMediaService } from "../services/whatsapp-media.service";

@Controller("whatsapp")
@UseGuards(JwtGuard)
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
    @Inject(forwardRef(() => WhatsappSocketService))
    private readonly whatsappSocketService: WhatsappSocketService,
    private readonly whatsappMessageService: WhatsappMessageService,
    private readonly whatsappMediaService: WhatsappMediaService,
  ) {}

  @Get("status")
  async findStatus(@GetUser() user: User) {
    return this.whatsappService.findStatus(user);
  }

  @Get("messages-by-phone/:phone")
  async findAllMessagesByPhone(
    @GetUser() user: User,
    @Param("phone") phone: string,
  ) {
    return this.whatsappMessageService.findAllByPhone(user, phone);
  }

  @Get("media/:messageId")
  async streamMedia(
    @GetUser() user: User,
    @Param("messageId") messageId: string,
    @Res() response: Response,
  ) {
    const message = await this.whatsappMessageService.findOneByMessageId(
      user,
      messageId,
    );

    if (!message?.mediaPath) {
      throw new NotFoundException("Media not found");
    }

    const absolutePath = this.whatsappMediaService.getAbsolutePath(
      message.mediaPath,
    );

    if (!existsSync(absolutePath)) {
      throw new NotFoundException("Media file not found on disk");
    }

    response.setHeader(
      "Content-Type",
      message.mimetype ?? "application/octet-stream",
    );

    response.sendFile(absolutePath);
  }

  @Delete("disconnect")
  async disconnect(@GetUser() user: User) {
    const fromSession = await this.whatsappService.disconnect(user);
    void this.whatsappSocketService.start(fromSession.id, user);
  }
}
