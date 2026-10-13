import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../shared/entities/base.entity";
import { PortalKey } from "../../property-hunts/enums/property-hunt.enum";
import { User } from "../../users/entities/user.entity";
import {
  AssistantActionKind,
  AssistantActionStatus,
} from "../enums/assistant.enum";
import { sealedJsonFieldsTransformer } from "../../../shared/utils/data-cipher.util";

export type AssistantAttachmentSource = "document" | "property_media";

/** A file that goes along with a WhatsApp message. */
export interface AssistantAttachment {
  source: AssistantAttachmentSource;
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface SendMessagePayload {
  conversationId: string | null;
  customerId: string | null;
  recipientName: string;
  /** May be empty when only files are sent. */
  text: string;
  /** Missing on actions made before attachments existed. */
  attachments?: AssistantAttachment[];
}

export interface ScheduleVisitPayload {
  customerId: string;
  customerName: string;
  propertyId: string | null;
  address: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
}

export interface AddNotePayload {
  customerId: string;
  customerName: string;
  note: string;
}

export interface MoveStagePayload {
  customerId: string;
  customerName: string;
  stageId: string;
  stageName: string;
}

export interface MarkLostPayload {
  customerId: string;
  customerName: string;
  lost: boolean;
}

/** Every paid action carries the price the broker sees before confirming. */
interface PaidActionPayload {
  estimatedCredits: number;
}

export interface PropertyHuntPayload extends PaidActionPayload {
  request: string;
  customerId: string | null;
  customerName: string | null;
  portals: PortalKey[];
  portalNames: string[];
  includeCatalog: boolean;
  pricePerListing: number;
  listingsPerPortal: number;
}

export interface OwnerSearchPayload extends PaidActionPayload {
  propertyId: string | null;
  propertyTitle: string;
  address: string | null;
  details: string | null;
}

export interface ContactImportItem {
  phone: string;
  name: string | null;
  hasHistory: boolean;
}

export interface ContactImportPayload extends PaidActionPayload {
  contacts: ContactImportItem[];
  /** The AI reads each chat, imports only work contacts and fills their file. */
  useAi: boolean;
  avatarFromPhoto: boolean;
  kanbanId: string | null;
  kanbanName: string | null;
}

export interface CertificateLookupPayload extends PaidActionPayload {
  propertyId: string;
  propertyTitle: string;
  lookupKey: string;
  certificateTitle: string;
  ownerName: string | null;
  ownerDocumentNumber: string | null;
}

export interface AssistantActionPayloads {
  [AssistantActionKind.SEND_MESSAGE]: SendMessagePayload;
  [AssistantActionKind.SCHEDULE_VISIT]: ScheduleVisitPayload;
  [AssistantActionKind.ADD_NOTE]: AddNotePayload;
  [AssistantActionKind.MOVE_STAGE]: MoveStagePayload;
  [AssistantActionKind.MARK_LOST]: MarkLostPayload;
  [AssistantActionKind.PROPERTY_HUNT]: PropertyHuntPayload;
  [AssistantActionKind.OWNER_SEARCH]: OwnerSearchPayload;
  [AssistantActionKind.CONTACT_IMPORT]: ContactImportPayload;
  [AssistantActionKind.CERTIFICATE_LOOKUP]: CertificateLookupPayload;
}

export interface AssistantActionResultItem {
  label: string;
  detail: string | null;
  /** An outside page, like the listing where an owner was found. */
  url: string | null;
}

/** What a paid action brought back, shown on its card and read by the model. */
export interface AssistantActionResult {
  summary: string;
  creditsCharged: number;
  items: AssistantActionResultItem[];
  /** A screen of the app to follow up, like the hunt running. */
  link: { label: string; path: string } | null;
}

export type AssistantActionPayload =
  AssistantActionPayloads[AssistantActionKind];

/**
 * Something the assistant prepared on behalf of the broker. Nothing happens
 * until the broker confirms it, so a chat or a customer message can never
 * make the assistant act alone.
 */
@Entity("assistant_actions")
@Index(["userId", "messageId"])
export class AssistantAction extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", nullable: false })
  userId: string;

  /** The assistant answer that proposed it, set once the answer is saved. */
  @Column({ type: "varchar", nullable: true })
  messageId: string | null;

  @Column({ type: "enum", enum: AssistantActionKind, nullable: false })
  kind: AssistantActionKind;

  @Column({
    type: "enum",
    enum: AssistantActionStatus,
    nullable: false,
    default: AssistantActionStatus.PENDING,
  })
  status: AssistantActionStatus;

  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  /** The owner CPF or CNPJ of a certificate proposal is sealed at rest. */
  @Column({
    type: "json",
    nullable: false,
    transformer: sealedJsonFieldsTransformer(["ownerDocumentNumber"]),
  })
  payload: AssistantActionPayload;

  @Column({ type: "json", nullable: true })
  result: AssistantActionResult | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  errorMessage: string | null;

  @Column({ type: "datetime", nullable: true })
  executedAt: Date | null;
}
