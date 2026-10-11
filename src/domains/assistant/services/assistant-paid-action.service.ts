import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AI_FEATURES } from "../../ai/ai-features.constant";
import {
  AI_ANALYSIS_BATCH_SIZE,
  ContactImportItemDto,
} from "../../contact-imports/dtos/contact-import.dto";
import { ContactAiAnalysisService } from "../../contact-imports/services/contact-ai-analysis.service";
import {
  ContactCandidate,
  ContactImportService,
} from "../../contact-imports/services/contact-import.service";
import { CreditPricingService } from "../../credits/services/credit-pricing.service";
import { CreditWalletService } from "../../credits/services/credit-wallet.service";
import { Customer } from "../../customers/entities/customer.entity";
import { DocumentLookupService } from "../../document-lookups/services/document-lookup.service";
import { phoneMatchingKey } from "../../inbox/helpers/whatsapp-phone.helper";
import { Kanban } from "../../kanbans/entities/kanban.entity";
import { OwnerFinderService } from "../../owner-finder/services/owner-finder.service";
import { Property } from "../../properties/entities/property.entity";
import { PORTALS } from "../../property-hunts/constants/portals.constant";
import { PortalKey } from "../../property-hunts/enums/property-hunt.enum";
import { PropertyHuntService } from "../../property-hunts/services/property-hunt.service";
import { User } from "../../users/entities/user.entity";
import {
  AssistantAction,
  AssistantActionPayload,
  AssistantActionResult,
  AssistantActionResultItem,
  CertificateLookupPayload,
  ContactImportPayload,
  OwnerSearchPayload,
  PropertyHuntPayload,
} from "../entities/assistant-action.entity";
import { AssistantActionKind } from "../enums/assistant.enum";
import { formatDay, shorten } from "../helpers/assistant-format.helper";
import {
  booleanOf,
  limitOf,
  propertyTitleOf,
  requireId,
  textOf,
  ToolArguments,
} from "../helpers/tool-arguments.helper";

/** Contacts one import can carry, the AI reads them in a few calls. */
const MAXIMUM_IMPORTED_CONTACTS = 40;
/** Listings a hunt must afford before it starts, the same rule as the screen. */
const MINIMUM_LISTINGS_AFFORDED = 3;

export interface PaidActionDraft {
  kind: AssistantActionKind;
  title: string;
  payload: AssistantActionPayload;
}

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatPhone = (phone: string) => {
  const digits = onlyDigits(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

const plural = (count: number, singular: string, many: string) =>
  `${count} ${count === 1 ? singular : many}`;

const CONFIDENCE_LABEL = { high: "alta", medium: "média", low: "baixa" };

/**
 * The paid features the assistant can run: a property hunt, the owner's
 * contact, importing WhatsApp contacts and public certificates. Each one is
 * only prepared here with its price, and runs through the same service as
 * the screen once the broker confirms, so it is charged the same way.
 */
@Injectable()
export class AssistantPaidActionService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Kanban)
    private readonly kanbanRepository: Repository<Kanban>,
    private readonly propertyHuntService: PropertyHuntService,
    private readonly ownerFinderService: OwnerFinderService,
    private readonly contactImportService: ContactImportService,
    private readonly contactAnalysisService: ContactAiAnalysisService,
    private readonly documentLookupService: DocumentLookupService,
    private readonly pricingService: CreditPricingService,
    private readonly walletService: CreditWalletService,
  ) {}

  /** WhatsApp contacts that are not customers yet, for the assistant to pick. */
  async listWhatsappContacts(
    user: User,
    parameters: ToolArguments,
    timezone: string,
  ) {
    const search = textOf(parameters.search)?.toLowerCase() ?? null;
    const searchDigits = search ? onlyDigits(search) : "";
    const onlyWithHistory = booleanOf(parameters.onlyWithHistory) ?? true;
    const limit = limitOf(parameters.limit, 20, MAXIMUM_IMPORTED_CONTACTS);

    const candidates = (
      await this.contactImportService.whatsappCandidates(user)
    ).filter((candidate) => !candidate.customerId);
    const matching = candidates
      .filter((candidate) => !onlyWithHistory || candidate.hasHistory)
      .filter(
        (candidate) =>
          !search ||
          (candidate.name ?? "").toLowerCase().includes(search) ||
          (searchDigits.length >= 4 && candidate.phone.includes(searchDigits)),
      )
      .sort(
        (first, second) =>
          (second.lastMessageAt?.getTime() ?? 0) -
          (first.lastMessageAt?.getTime() ?? 0),
      );

    return {
      notCustomersYet: candidates.length,
      matching: matching.length,
      aiPricePerContact: this.pricingService.featurePrice("contact_import"),
      photoAvatarPrice: this.pricingService.featurePrice("avatar_from_photo"),
      contacts: matching.slice(0, limit).map((candidate) => ({
        phone: candidate.phone,
        name: candidate.name,
        hasHistory: candidate.hasHistory,
        lastMessageAt: candidate.lastMessageAt
          ? formatDay(candidate.lastMessageAt, timezone)
          : null,
        lastMessage: candidate.lastMessagePreview
          ? shorten(candidate.lastMessagePreview, 120)
          : null,
        hiddenInInbox: candidate.hiddenInInbox,
      })),
    };
  }

  /** The certificates of a property, which ones run on their own and their price. */
  async listCertificates(
    user: User,
    parameters: ToolArguments,
    timezone: string,
  ) {
    const propertyId = requireId(parameters.propertyId, "imóvel");
    const overview = await this.documentLookupService.overview(
      user,
      propertyId,
    );
    return {
      automaticAvailable: overview.automaticAvailable,
      needsOwners: overview.needsOwners,
      certificates: overview.items.map((item) => ({
        lookupKey: item.key,
        title: item.title,
        ownerName: item.ownerName,
        ownerDocumentNumber: item.ownerDocumentNumber,
        automatic: item.automatic,
        missingFields: item.missingFields,
        priceInCredits: item.priceInCredits,
        lastRun: item.lastRun && {
          status: item.lastRun.status,
          message: item.lastRun.message,
          when: formatDay(item.lastRun.createdAt, timezone),
        },
      })),
    };
  }

  async prepareHunt(
    user: User,
    parameters: ToolArguments,
  ): Promise<PaidActionDraft> {
    const request = textOf(parameters.request);
    if (!request || request.length < 3) {
      throw new BadRequestException("Descreva o imóvel que o cliente procura.");
    }

    const customerId = textOf(parameters.customerId);
    const customer = customerId
      ? await this.customerRepository.findOneBy({
          id: requireId(customerId, "cliente"),
          userId: user.id,
          active: true,
        })
      : null;
    if (customerId && !customer) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    const estimate = this.propertyHuntService.estimate();
    const asked = Array.isArray(parameters.portals)
      ? parameters.portals.filter((portal): portal is PortalKey =>
          estimate.portals.includes(portal as PortalKey),
        )
      : estimate.portals;
    // Without the browser the portals are skipped and nothing is charged.
    const portals = estimate.browserReady ? [...new Set(asked)] : [];
    const includeCatalog = booleanOf(parameters.includeCatalog) ?? true;
    if (!portals.length && !includeCatalog) {
      throw new BadRequestException(
        estimate.browserReady
          ? "Escolha pelo menos um portal ou a carteira do corretor."
          : "As buscas nos portais estão desligadas no servidor, só dá para buscar na carteira.",
      );
    }

    const payload: PropertyHuntPayload = {
      request: request.substring(0, 1500),
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      portals,
      portalNames: portals.map((portal) => PORTALS[portal].label),
      includeCatalog,
      pricePerListing: estimate.pricePerListing,
      listingsPerPortal: estimate.listingsPerPortal,
      estimatedCredits:
        estimate.interpretPrice +
        portals.length * estimate.listingsPerPortal * estimate.pricePerListing,
    };
    return {
      kind: AssistantActionKind.PROPERTY_HUNT,
      title: customer
        ? `Caçar imóveis para ${customer.name}`
        : "Caçar imóveis com IA",
      payload,
    };
  }

  async prepareOwnerSearch(
    user: User,
    parameters: ToolArguments,
  ): Promise<PaidActionDraft> {
    const propertyId = textOf(parameters.propertyId);
    const property = propertyId
      ? await this.propertyRepository.findOneBy({
          id: requireId(propertyId, "imóvel"),
          userId: user.id,
          active: true,
        })
      : null;
    if (propertyId && !property) {
      throw new NotFoundException("Imóvel não encontrado.");
    }

    const address = textOf(parameters.address);
    if (!property && (!address || address.length < 5)) {
      throw new BadRequestException(
        "Preciso do imóvel cadastrado ou do endereço completo.",
      );
    }

    const payload: OwnerSearchPayload = {
      propertyId: property?.id ?? null,
      propertyTitle: property
        ? propertyTitleOf(property)
        : (address ?? "").substring(0, 120),
      address: property ? null : (address ?? "").substring(0, 300),
      details: textOf(parameters.details)?.substring(0, 500) ?? null,
      estimatedCredits: this.pricingService.featurePrice("owner_search"),
    };
    return {
      kind: AssistantActionKind.OWNER_SEARCH,
      title: `Buscar o contato do proprietário: ${payload.propertyTitle}`,
      payload,
    };
  }

  async prepareContactImport(
    user: User,
    parameters: ToolArguments,
  ): Promise<PaidActionDraft> {
    const phones = Array.isArray(parameters.phones)
      ? parameters.phones
          .map((phone) => textOf(phone))
          .filter((phone): phone is string => Boolean(phone))
      : [];
    if (!phones.length) {
      throw new BadRequestException(
        "Escolha os contatos com list_whatsapp_contacts antes.",
      );
    }
    if (phones.length > MAXIMUM_IMPORTED_CONTACTS) {
      throw new BadRequestException(
        `Importe no máximo ${MAXIMUM_IMPORTED_CONTACTS} contatos por vez.`,
      );
    }

    const candidates = await this.candidatesByPhone(user);
    const chosen = new Map<string, ContactCandidate>();
    for (const phone of phones) {
      const candidate = candidates.get(phoneMatchingKey(onlyDigits(phone)));
      if (candidate && !candidate.customerId) {
        chosen.set(candidate.phone, candidate);
      }
    }
    if (!chosen.size) {
      throw new BadRequestException(
        "Nenhum desses números está no WhatsApp sem ser cliente.",
      );
    }

    const useAi = booleanOf(parameters.useAi) ?? true;
    const avatarFromPhoto = booleanOf(parameters.avatarFromPhoto) ?? false;
    const contacts = [...chosen.values()].map((candidate) => ({
      phone: candidate.phone,
      name: candidate.name,
      hasHistory: candidate.hasHistory && Boolean(candidate.chatJid),
    }));
    const readable = contacts.filter((contact) => contact.hasHistory).length;
    if (useAi && !readable) {
      throw new BadRequestException(
        "Nenhum desses contatos tem conversa para a IA ler, importe sem IA.",
      );
    }

    const kanbanId = textOf(parameters.kanbanId);
    const kanban = kanbanId
      ? await this.kanbanRepository.findOneBy({
          id: requireId(kanbanId, "etapa"),
          userId: user.id,
          active: true,
        })
      : null;
    if (kanbanId && !kanban) {
      throw new NotFoundException("Etapa não encontrada.");
    }

    const payload: ContactImportPayload = {
      contacts,
      useAi,
      avatarFromPhoto,
      kanbanId: kanban?.id ?? null,
      kanbanName: kanban?.name ?? null,
      estimatedCredits:
        (useAi
          ? readable * this.pricingService.featurePrice("contact_import")
          : 0) +
        (avatarFromPhoto
          ? contacts.length *
            this.pricingService.featurePrice("avatar_from_photo")
          : 0),
    };
    return {
      kind: AssistantActionKind.CONTACT_IMPORT,
      title: `Importar ${plural(contacts.length, "contato", "contatos")} do WhatsApp${useAi ? " com IA" : ""}`,
      payload,
    };
  }

  async prepareCertificateLookup(
    user: User,
    parameters: ToolArguments,
  ): Promise<PaidActionDraft> {
    const propertyId = requireId(parameters.propertyId, "imóvel");
    const lookupKey = textOf(parameters.lookupKey);
    const ownerDigits = onlyDigits(
      textOf(parameters.ownerDocumentNumber) ?? "",
    );

    const [overview, property] = await Promise.all([
      this.documentLookupService.overview(user, propertyId),
      this.propertyRepository.findOneByOrFail({ id: propertyId }),
    ]);
    if (!overview.automaticAvailable) {
      throw new BadRequestException(
        "A busca automática de certidões não está configurada.",
      );
    }

    const item = overview.items.find(
      (candidate) =>
        candidate.key === lookupKey &&
        (!candidate.ownerDocumentNumber ||
          onlyDigits(candidate.ownerDocumentNumber) === ownerDigits),
    );
    if (!item) {
      throw new NotFoundException(
        "Certidão não encontrada para esse imóvel ou proprietário, veja list_certificates.",
      );
    }
    if (!item.automatic || item.priceInCredits === null) {
      throw new BadRequestException(
        `Essa certidão é emitida direto no portal: ${item.manualUrl}`,
      );
    }
    if (item.missingFields.length) {
      throw new BadRequestException(
        `Falta preencher no imóvel: ${item.missingFields.join(", ")}.`,
      );
    }

    const payload: CertificateLookupPayload = {
      propertyId,
      propertyTitle: propertyTitleOf(property),
      lookupKey: item.key,
      certificateTitle: item.title,
      ownerName: item.ownerName,
      ownerDocumentNumber: item.ownerDocumentNumber,
      estimatedCredits: item.priceInCredits,
    };
    return {
      kind: AssistantActionKind.CERTIFICATE_LOOKUP,
      title: item.ownerName
        ? `${item.title} de ${item.ownerName}`
        : `${item.title}: ${payload.propertyTitle}`,
      payload,
    };
  }

  /**
   * The balance asked before running, the same the screen asks, so a broker
   * without credits keeps the card to confirm after buying.
   */
  async ensureAffordable(user: User, action: AssistantAction) {
    await this.walletService.ensureBalance(
      user.id,
      this.requiredCredits(action),
    );
  }

  async execute(
    user: User,
    action: AssistantAction,
  ): Promise<AssistantActionResult> {
    switch (action.kind) {
      case AssistantActionKind.PROPERTY_HUNT:
        return this.runHunt(user, action.payload as PropertyHuntPayload);
      case AssistantActionKind.OWNER_SEARCH:
        return this.runOwnerSearch(user, action.payload as OwnerSearchPayload);
      case AssistantActionKind.CONTACT_IMPORT:
        return this.runContactImport(
          user,
          action.payload as ContactImportPayload,
        );
      case AssistantActionKind.CERTIFICATE_LOOKUP:
        return this.runCertificateLookup(
          user,
          action.payload as CertificateLookupPayload,
        );
      default:
        throw new BadRequestException("Essa ação não é paga.");
    }
  }

  private requiredCredits(action: AssistantAction) {
    switch (action.kind) {
      case AssistantActionKind.PROPERTY_HUNT: {
        const payload = action.payload as PropertyHuntPayload;
        return (
          this.pricingService.featurePrice("hunt_criteria") +
          (payload.portals.length
            ? payload.pricePerListing * MINIMUM_LISTINGS_AFFORDED
            : 0)
        );
      }
      case AssistantActionKind.OWNER_SEARCH:
        return (
          this.pricingService.featurePrice("owner_search") *
          (AI_FEATURES.owner_search.reserveMultiplier ?? 1)
        );
      default:
        return (action.payload as { estimatedCredits: number })
          .estimatedCredits;
    }
  }

  private async runHunt(
    user: User,
    payload: PropertyHuntPayload,
  ): Promise<AssistantActionResult> {
    const interpreted = await this.propertyHuntService.interpret(
      user,
      payload.request,
    );
    const hunt = await this.propertyHuntService.create(user, {
      request: payload.request,
      headline: interpreted.headline,
      summary: null,
      criteria: interpreted.criteria,
      portals: payload.portals,
      includeCatalog: payload.includeCatalog,
      customerId: payload.customerId,
      conversationId: null,
      saveSummaryAsNote: false,
    });

    const where = [
      payload.includeCatalog ? "na sua carteira" : null,
      payload.portalNames.length ? payload.portalNames.join(", ") : null,
    ]
      .filter(Boolean)
      .join(" e em ");
    return {
      summary: [
        `A caça começou: ${interpreted.headline}. Buscando ${where}.`,
        payload.portals.length
          ? `Ela segue em segundo plano e cobra ${payload.pricePerListing} créditos por anúncio lido, até ${payload.portals.length * payload.listingsPerPortal * payload.pricePerListing}.`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
      creditsCharged: interpreted.creditsCharged,
      items: [],
      link: { label: "Acompanhar a caça", path: `/hunts/${hunt.id}` },
    };
  }

  private async runOwnerSearch(
    user: User,
    payload: OwnerSearchPayload,
  ): Promise<AssistantActionResult> {
    const found = await this.ownerFinderService.searchContacts(user, {
      propertyId: payload.propertyId,
      address: payload.address,
      details: payload.details,
    });

    const items: AssistantActionResultItem[] = found.contacts.map(
      (contact) => ({
        label: `${contact.name ?? "Proprietário"} · ${formatPhone(contact.phone)}`,
        detail: [
          `${contact.sourceName}, confiança ${CONFIDENCE_LABEL[contact.matchConfidence]}`,
          contact.verified ? "conferido no anúncio" : null,
          contact.alreadySaved ? "já salvo no imóvel" : null,
          contact.evidence,
        ]
          .filter(Boolean)
          .join(" · ")
          .substring(0, 300),
        url: contact.sourceUrl,
      }),
    );
    return {
      summary: items.length
        ? `Achei ${plural(items.length, "contato", "contatos")} do proprietário${found.ignoredIntermediaries ? `, ignorei ${plural(found.ignoredIntermediaries, "anúncio", "anúncios")} de corretor` : ""}. Confira no anúncio antes de ligar.`
        : `Não achei anúncios do próprio dono${found.ignoredIntermediaries ? `, só ${plural(found.ignoredIntermediaries, "anúncio", "anúncios")} de corretor` : ""}.`,
      creditsCharged: found.creditsCharged,
      items,
      link: payload.propertyId
        ? {
            label: "Abrir o imóvel",
            path: `/properties/${payload.propertyId}`,
          }
        : null,
    };
  }

  private async runContactImport(
    user: User,
    payload: ContactImportPayload,
  ): Promise<AssistantActionResult> {
    const candidates = await this.candidatesByPhone(user);
    const chosen = payload.contacts
      .map((contact) => candidates.get(phoneMatchingKey(contact.phone)))
      .filter(
        (candidate): candidate is ContactCandidate =>
          Boolean(candidate) && !candidate?.customerId,
      );
    if (!chosen.length) {
      throw new BadRequestException("Esses contatos já viraram clientes.");
    }

    let creditsCharged = 0;
    let analyzedCount = 0;
    let stoppedBecause: string | null = null;
    let items: ContactImportItemDto[];
    const reasons = new Map<string, string>();

    if (payload.useAi) {
      const readable = chosen.filter(
        (candidate) => candidate.hasHistory && candidate.chatJid,
      );
      items = [];
      for (
        let start = 0;
        start < readable.length;
        start += AI_ANALYSIS_BATCH_SIZE
      ) {
        const batch = readable.slice(start, start + AI_ANALYSIS_BATCH_SIZE);
        try {
          const analysis = await this.contactAnalysisService.analyze(user, {
            contacts: batch.map((candidate) => ({
              phone: candidate.phone,
              chatJid: candidate.chatJid as string,
              name: candidate.name,
            })),
          });
          creditsCharged += analysis.creditsCharged;
          analyzedCount += batch.length;
          for (const result of analysis.results) {
            if (!result.relevant) continue;
            const candidate = batch.find((item) => item.phone === result.phone);
            items.push({
              name: result.name ?? candidate?.name ?? `+${result.phone}`,
              phone: result.phone,
              chatJid: candidate?.chatJid ?? null,
              kanbanId: result.kanbanId ?? payload.kanbanId,
              budget: result.budget,
              note: result.note,
            });
            reasons.set(result.phone, result.reason);
          }
        } catch (error) {
          // What was already read and paid for still comes in.
          if (!(error instanceof HttpException) || !start) throw error;
          stoppedBecause = error.message;
          break;
        }
      }
    } else {
      items = chosen.map((candidate) => ({
        name: candidate.name ?? `+${candidate.phone}`,
        phone: candidate.phone,
        chatJid: candidate.chatJid,
        kanbanId: payload.kanbanId,
        budget: null,
        note: null,
      }));
    }

    const imported = items.length
      ? await this.contactImportService.importContacts(user, {
          source: "whatsapp",
          kanbanId: payload.kanbanId,
          importHistory: true,
          avatarFromPhoto: payload.avatarFromPhoto,
          contacts: items,
        })
      : null;

    const created = imported?.customers ?? [];
    const notWork = payload.useAi ? analyzedCount - items.length : 0;
    return {
      summary: [
        created.length
          ? `Importei ${plural(created.length, "contato", "contatos")} como clientes.`
          : "Nenhum contato foi importado.",
        payload.useAi && notWork > 0
          ? `A IA deixou de fora ${plural(notWork, "contato que não parece", "contatos que não parecem")} de trabalho.`
          : null,
        payload.avatarFromPhoto && imported?.photosQueued
          ? "Os bonequinhos pela foto ficam prontos em segundo plano, cobrados por foto."
          : null,
        stoppedBecause ? `A leitura parou no meio: ${stoppedBecause}` : null,
      ]
        .filter(Boolean)
        .join(" "),
      creditsCharged,
      items: created.map((customer) => ({
        label: customer.name,
        detail: reasons.get(customer.phone) ?? formatPhone(customer.phone),
        url: null,
      })),
      link: created.length
        ? { label: "Ver clientes", path: "/customers" }
        : null,
    };
  }

  private async runCertificateLookup(
    user: User,
    payload: CertificateLookupPayload,
  ): Promise<AssistantActionResult> {
    const lookup = await this.documentLookupService.run(
      user,
      payload.propertyId,
      payload.lookupKey,
      { ownerDocumentNumber: payload.ownerDocumentNumber },
    );
    return {
      summary: lookup.documents.length
        ? `${lookup.message} Guardei nos documentos do imóvel.`
        : lookup.message,
      creditsCharged: lookup.creditsCharged,
      items: [
        ...lookup.documents.map((document) => ({
          label: document.displayName,
          detail: null,
          url: null,
        })),
        ...lookup.receiptUrls.map((url, index) => ({
          label: `Comprovante ${index + 1}`,
          detail: "Link temporário",
          url,
        })),
      ],
      link: {
        label: "Abrir o imóvel",
        path: `/properties/${payload.propertyId}`,
      },
    };
  }

  private async candidatesByPhone(user: User) {
    const candidates = await this.contactImportService.whatsappCandidates(user);
    return new Map(
      candidates.map((candidate) => [
        phoneMatchingKey(candidate.phone),
        candidate,
      ]),
    );
  }
}
