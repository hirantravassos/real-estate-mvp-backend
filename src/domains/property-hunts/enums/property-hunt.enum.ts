export enum PortalKey {
  ZAP_IMOVEIS = "zap_imoveis",
  VIVA_REAL = "viva_real",
  QUINTO_ANDAR = "quinto_andar",
  OLX = "olx",
  CHAVES_NA_MAO = "chaves_na_mao",
  IMOVELWEB = "imovelweb",
}

export enum PropertyHuntStatus {
  QUEUED = "queued",
  RUNNING = "running",
  FINISHED = "finished",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum PropertyHuntOrigin {
  MANUAL = "manual",
  CONVERSATION = "conversation",
  CUSTOMER = "customer",
}

export enum PropertyMatchOrigin {
  PORTAL = "portal",
  CATALOG = "catalog",
  MANUAL = "manual",
}

export enum PropertyMatchStatus {
  NEW = "new",
  FAVORITE = "favorite",
  DISCARDED = "discarded",
  SENT = "sent",
}

export enum PortalProgressStatus {
  WAITING = "waiting",
  SEARCHING = "searching",
  READING = "reading",
  DONE = "done",
  FAILED = "failed",
  SKIPPED = "skipped",
}
