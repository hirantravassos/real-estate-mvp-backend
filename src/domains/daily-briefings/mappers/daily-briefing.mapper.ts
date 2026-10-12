import {
  DailyBriefing,
  DailyBriefingContent,
} from "../entities/daily-briefing.entity";
import { DailyBriefingOrigin } from "../enums/daily-briefing.enum";

export interface DailyBriefingDto {
  id: string;
  day: string;
  origin: DailyBriefingOrigin;
  content: DailyBriefingContent;
  creditsCharged: number;
  generatedAt: string;
}

export interface DailyBriefingOverviewDto {
  /** The latest ready briefing, it may be from an earlier day. */
  briefing: DailyBriefingDto | null;
  /** A briefing is being written right now. */
  generating: boolean;
  today: string;
  /** Today's free briefing was not used yet. */
  freeAvailable: boolean;
  nextSweepAt: string;
  /** Credits a usual extra briefing costs. */
  extraPrice: number;
}

export class DailyBriefingMapper {
  static toDto(briefing: DailyBriefing): DailyBriefingDto {
    return {
      id: briefing.id,
      day: briefing.day,
      origin: briefing.origin,
      content: briefing.content as DailyBriefingContent,
      creditsCharged: briefing.creditsCharged,
      generatedAt: (briefing.generatedAt ?? briefing.createdAt).toISOString(),
    };
  }
}
