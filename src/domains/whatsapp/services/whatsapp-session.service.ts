import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WhatsappConnectionStatusEnum } from "../enums/whatsapp-connection-status.enum";
import { WhatsappSessionRepository } from "../repositories/whatsapp-session.repository";
import { User } from "../../users/entities/user.entity";
import { WhatsappGateway } from "../gateways/whatsapp.gateway";
import { WhatsappSession } from "../entities/whatsapp-session.entity";

export class WhatsappSessionCreateDto {
  name: string;
  qr: string | null;
  status: WhatsappConnectionStatusEnum;
}

@Injectable()
export class WhatsappSessionService {
  constructor(
    private readonly sessionRepository: WhatsappSessionRepository,
    @Inject(forwardRef(() => WhatsappGateway))
    private readonly whatsappGateway: WhatsappGateway,
  ) { }

  async findOneByUserId(userId: string) {
    return this.sessionRepository
      .findOneOrFail({
        where: { user: { id: userId } },
        relations: {
          user: true,
        },
      })
      .catch(() => {
        throw new NotFoundException("Whatsapp session not found by user id");
      });
  }

  async findOne(user: User): Promise<WhatsappSession> {
    return await this.sessionRepository
      .findOneOrFail({
        where: { user: { id: user.id } },
        relations: {
          user: true,
        },
      })
      .catch(() => {
        throw new NotFoundException("Whatsapp session not found");
      });
  }

  async save(
    user: User,
    dto: Partial<WhatsappSessionCreateDto>,
  ): Promise<WhatsappSession> {
    const existingSession = await this.findOne(user).catch(() => null);

    await this.sessionRepository.upsert(
      {
        ...dto,
        user,
      },
      ["user"],
    );

    const newSession = await this.findOne(user).catch(() => {
      throw new NotFoundException(
        "Failed to retrieve recently created Whatsapp session",
      );
    });

    const hasStatusChanged =
      !existingSession || existingSession.status !== newSession.status;

    const hasQrChanged =
      !existingSession || existingSession.qr !== newSession.qr;

    if (hasStatusChanged || hasQrChanged) {
      this.whatsappGateway.emitStatusUpdate(user.id, newSession);
    }

    return newSession;
  }
}
