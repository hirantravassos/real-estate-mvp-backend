import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { ListingShortcut } from "../entities/listing-shortcut.entity";
import { PropertyMatch } from "../entities/property-match.entity";
import {
  PropertyMatchOrigin,
  PropertyMatchStatus,
} from "../enums/property-hunt.enum";
import { withoutPersonalContacts, truncate } from "../helpers/text.helper";
import { PropertyHuntMapper } from "../mappers/property-hunt.mapper";

/** Most shortcuts one broker keeps at the same time. */
const MAXIMUM_SHORTCUTS = 300;

/**
 * Portal listings kept at hand by the broker, as a link and a small card.
 * Private to the broker: no other service reads them, so they never reach a
 * public page, a customer or a message.
 */
@Injectable()
export class ListingShortcutService {
  constructor(
    @InjectRepository(ListingShortcut)
    private readonly shortcutRepository: Repository<ListingShortcut>,
    @InjectRepository(PropertyMatch)
    private readonly matchRepository: Repository<PropertyMatch>,
  ) {}

  async findAll(user: User) {
    const shortcuts = await this.shortcutRepository.find({
      where: { userId: user.id, active: true },
      order: { createdAt: "DESC" },
      take: MAXIMUM_SHORTCUTS,
    });
    return shortcuts.map((shortcut) =>
      PropertyHuntMapper.toShortcutDto(shortcut),
    );
  }

  /** Keeps a hunt suggestion found on a portal as a shortcut. */
  async createFromMatch(user: User, matchId: string) {
    const match = await this.matchRepository.findOneBy({
      id: matchId,
      userId: user.id,
      active: true,
    });
    if (!match) throw new NotFoundException("Sugestão não encontrada.");
    if (
      match.origin !== PropertyMatchOrigin.PORTAL ||
      !match.portal ||
      !match.externalUrl
    ) {
      throw new BadRequestException(
        "Só anúncios achados nos portais viram atalho.",
      );
    }

    const existing = await this.shortcutRepository.findOneBy({
      userId: user.id,
      externalUrl: match.externalUrl,
      active: true,
    });
    if (existing) {
      return { ...PropertyHuntMapper.toShortcutDto(existing), created: false };
    }

    const kept = await this.shortcutRepository.count({
      where: { userId: user.id, active: true },
    });
    if (kept >= MAXIMUM_SHORTCUTS) {
      throw new BadRequestException(
        `Você já tem ${MAXIMUM_SHORTCUTS} atalhos. Apague alguns para guardar novos.`,
      );
    }

    const listing = match.listing;
    const shortcut = await this.shortcutRepository.save(
      this.shortcutRepository.create({
        userId: user.id,
        matchId: match.id,
        portal: match.portal,
        externalUrl: match.externalUrl,
        title: truncate(withoutPersonalContacts(match.title), 255),
        kind: listing?.kind ?? null,
        transaction: listing?.transaction ?? null,
        price: match.price,
        bedrooms: listing?.bedrooms ?? null,
        area:
          typeof listing?.area === "number" ? listing.area.toFixed(2) : null,
        neighborhood: listing?.neighborhood ?? null,
        city: listing?.city ?? null,
        state: listing?.state ?? null,
        summary: listing?.description
          ? truncate(withoutPersonalContacts(listing.description), 400)
          : null,
      }),
    );

    if (match.status === PropertyMatchStatus.NEW) {
      await this.matchRepository.update(
        { id: match.id, userId: user.id },
        { status: PropertyMatchStatus.FAVORITE },
      );
    }
    return { ...PropertyHuntMapper.toShortcutDto(shortcut), created: true };
  }

  async remove(user: User, id: string) {
    const shortcut = await this.shortcutRepository.findOneBy({
      id,
      userId: user.id,
      active: true,
    });
    if (!shortcut) throw new NotFoundException("Atalho não encontrado.");
    await this.shortcutRepository.delete({ id: shortcut.id, userId: user.id });
  }
}
