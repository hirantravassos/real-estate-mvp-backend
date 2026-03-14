import { InjectRepository } from "@nestjs/typeorm";
import { WhatsappStatus } from "../entities/whatsapp-status.entity";
import { Repository } from "typeorm";
import {
  WhatsappStatusDto,
  WhatsappStatusMapper,
} from "../mappers/whatsapp-status.mapper";
import { User } from "../../users/entities/user.entity";
import { Logger } from "@nestjs/common";

export class WhatsappStatusService {
  private readonly logger = new Logger(WhatsappStatusService.name);

  constructor(
    @InjectRepository(WhatsappStatus)
    private readonly whatsappStatusRepository: Repository<WhatsappStatus>,
  ) {}

  async findStatus(user: User): Promise<WhatsappStatusDto> {
    const status = await this.whatsappStatusRepository.findOne({
      where: {
        user: { id: user.id },
      },
    });
    return WhatsappStatusMapper.toDto(status);
  }

  async clearUpdateStatus(user: User) {
    try {
      await this.whatsappStatusRepository.update(
        {
          user: { id: user.id },
        },
        {
          hasUpdates: false,
        },
      );
    } catch (error) {
      this.logger.error(
        "[WhatsappStatusService.clearUpdateStatus] error while updating",
        error,
      );
    }
  }
}
