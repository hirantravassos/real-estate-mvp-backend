export enum AssistantRole {
  USER = "user",
  ASSISTANT = "assistant",
}

/** Things the assistant can do for the broker, always after a confirmation. */
export enum AssistantActionKind {
  SEND_MESSAGE = "send_message",
  SCHEDULE_VISIT = "schedule_visit",
  ADD_NOTE = "add_note",
  MOVE_STAGE = "move_stage",
  MARK_LOST = "mark_lost",
  /** The paid ones run a paid feature and charge it like the broker clicked it. */
  PROPERTY_HUNT = "property_hunt",
  OWNER_SEARCH = "owner_search",
  CONTACT_IMPORT = "contact_import",
  CERTIFICATE_LOOKUP = "certificate_lookup",
}

/** Actions that spend credits, confirmed only with their price on screen. */
export const PAID_ACTION_KINDS: ReadonlySet<AssistantActionKind> = new Set([
  AssistantActionKind.PROPERTY_HUNT,
  AssistantActionKind.OWNER_SEARCH,
  AssistantActionKind.CONTACT_IMPORT,
  AssistantActionKind.CERTIFICATE_LOOKUP,
]);

export enum AssistantActionStatus {
  PENDING = "pending",
  RUNNING = "running",
  DONE = "done",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum AssistantReferenceType {
  CUSTOMER = "customer",
  PROPERTY = "property",
  CONVERSATION = "conversation",
  VISIT = "visit",
  /** A file the assistant wrote or the broker attached. */
  DOCUMENT = "document",
}
