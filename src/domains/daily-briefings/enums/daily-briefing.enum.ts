/** How the briefing came to be, it decides who paid for it. */
export enum DailyBriefingOrigin {
  /** The morning sweep, the free one of the day. */
  SCHEDULED = "scheduled",
  /** Asked by the broker before the sweep reached them, still free. */
  MANUAL = "manual",
  /** Asked again the same day, paid with credits. */
  PAID = "paid",
}

export enum DailyBriefingStatus {
  GENERATING = "generating",
  READY = "ready",
}
