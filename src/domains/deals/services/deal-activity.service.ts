import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { RealtimeGateway } from "../../../infrastructure/realtime/realtime.gateway";
import { DealEvent } from "../entities/deal-event.entity";
import { DealEventActor, DealEventKind } from "../enums/deal.enum";

interface DealEventInput {
  dealId: string;
  kind: DealEventKind;
  actor: DealEventActor;
  message: string;
  visibleToCustomer?: boolean;
}

/** Writes the sale history and pings the broker's open app. */
@Injectable()
export class DealActivityService {
  constructor(
    @InjectRepository(DealEvent)
    private readonly eventRepository: Repository<DealEvent>,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async record(input: DealEventInput, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(DealEvent)
      : this.eventRepository;
    const event = repository.create({
      dealId: input.dealId,
      kind: input.kind,
      actor: input.actor,
      message: input.message.substring(0, 1000),
      visibleToCustomer: input.visibleToCustomer ?? true,
    });
    return repository.save(event);
  }

  notifyBroker(userId: string, dealId: string) {
    this.realtimeGateway.emitToUser(userId, "deal.updated", { dealId });
  }
}
