import { WhatsappClientStatusEnum } from "../enums/whatsapp-client-status.enum";
import { WhatsappStatus } from "../entities/whatsapp-status.entity";

export interface WhatsappStatusDto {
  status: WhatsappClientStatusEnum;
  qr?: string | null;
  isSyncing: boolean;
  hasUpdates: boolean;
}

export class WhatsappStatusMapper {
  static toDto(entity?: WhatsappStatus | null): WhatsappStatusDto {
    if (!entity)
      return {
        status: WhatsappClientStatusEnum.ERROR,
        isSyncing: false,
        hasUpdates: false,
        qr: null,
      };

    return {
      status: entity.status,
      isSyncing: entity.isSyncing,
      hasUpdates: entity.hasUpdates,
      qr: entity.qr,
    };
  }
}
