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
}

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
