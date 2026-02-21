import { Injectable, Logger } from '@nestjs/common';
import { CustomerRepository } from '../repositories/customer.repository';
import { KanbanSectionRepository } from '../../kanban/repositories/kanban-section.repository';
import { Customer } from '../entities/customer.entity';

export interface WhatsAppContactInput {
  jid: string;
  name?: string;
  categoryId?: string | null;
}

export interface SyncReportDetail {
  phone: string;
  name?: string;
  status: 'success' | 'skipped' | 'error';
  reason?: string;
}

export interface SyncReport {
  total: number;
  success: number;
  skipped: number;
  errors: number;
  details: SyncReportDetail[];
}

@Injectable()
export class SyncWhatsAppContactsUseCase {
  private readonly logger = new Logger(SyncWhatsAppContactsUseCase.name);

  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly kanbanSectionRepository: KanbanSectionRepository,
  ) {}

  /**
   * Normalizes a JID or phone string to digits only.
   * "5511999999999@s.whatsapp.net" -> "5511999999999"
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  /**
   * Validates if a phone string (only digits) is a valid Brazilian number
   * Length must be 12 (landline) or 13 (mobile) including 55
   */
  private isValidBrazilianNumber(phoneDigits: string): boolean {
    // Must start with 55 (Brazil country code)
    if (!phoneDigits.startsWith('55')) return false;

    // After 55, it needs a 2 digit area code + 8 or 9 digits phone number -> 10 or 11 characters
    const localPart = phoneDigits.substring(2);
    return localPart.length === 10 || localPart.length === 11;
  }

  async execute(
    userId: string,
    contacts: WhatsAppContactInput[],
  ): Promise<SyncReport> {
    const report: SyncReport = {
      total: contacts.length,
      success: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    if (!contacts.length) return report;

    this.logger.log(
      `Syncing ${contacts.length} WhatsApp contacts for user ${userId}`,
    );

    // 1. Filter out non-user JIDs (like groups @g.us, broadcasts @broadcast, linked devices @lid)
    const validContacts = contacts.filter((c) => {
      if (!c.jid) return false;

      const isUser = c.jid.endsWith('@s.whatsapp.net');
      if (!isUser) {
        report.skipped++;
        report.details.push({
          phone: c.jid,
          name: c.name,
          status: 'skipped',
          reason: 'Not an individual user account',
        });
      }
      return isUser;
    });

    if (!validContacts.length) {
      this.logger.debug('No valid individual contacts found to sync.');
      return report;
    }

    // 2. Normalize incoming phone numbers
    const incomingPhones = validContacts
      .map((c) => ({
        ...c,
        normalizedPhone: this.normalizePhone(c.jid.split('@')[0]),
      }))
      .filter((c) => c.normalizedPhone.length > 0);

    // 3. Fetch all existing customers and build a Set of their normalized phones
    const existingCustomers =
      await this.customerRepository.findAllByUserId(userId);
    const existingPhoneSet = new Set(
      existingCustomers.map((c) => this.normalizePhone(c.phone)),
    );

    // 4. Deduplicate incoming contacts and validate Brazilian numbers
    const newContactsToInsert: typeof incomingPhones = [];
    const seenIncomingPhones = new Set<string>();

    for (const contact of incomingPhones) {
      // Check if Brazilian
      if (!this.isValidBrazilianNumber(contact.normalizedPhone)) {
        report.skipped++;
        report.details.push({
          phone: contact.normalizedPhone,
          name: contact.name,
          status: 'skipped',
          reason: 'Not a Brazilian number',
        });
        continue;
      }

      // Skip if already in DB
      if (existingPhoneSet.has(contact.normalizedPhone)) {
        report.skipped++;
        report.details.push({
          phone: contact.normalizedPhone,
          name: contact.name,
          status: 'skipped',
          reason: 'Contact already exists in CRM',
        });
        continue;
      }

      // Skip if we already processed this in current batch
      if (seenIncomingPhones.has(contact.normalizedPhone)) {
        report.skipped++;
        // Skip adding to details to not clutter with exact duplicates
        continue;
      }

      seenIncomingPhones.add(contact.normalizedPhone);
      newContactsToInsert.push(contact);
    }

    if (!newContactsToInsert.length) {
      this.logger.log(`No new contacts to insert for user ${userId}.`);
      return report;
    }

    // 5. Calculate Kanban Order for each section
    const orderCounts = new Map<string, number>();

    // 6. Map contacts to Customer entities
    const customerEntities: Partial<Customer>[] = [];

    for (const contact of newContactsToInsert) {
      const sectionId =
        contact.categoryId !== undefined ? contact.categoryId : null;
      let order = 0;

      if (sectionId) {
        if (!orderCounts.has(sectionId)) {
          const count = await this.customerRepository.countBySectionId(
            sectionId,
            userId,
          );
          orderCounts.set(sectionId, count);
        }
        order = orderCounts.get(sectionId)!;
        orderCounts.set(sectionId, order + 1);
      }

      customerEntities.push({
        userId,
        kanbanSectionId: sectionId,
        name: contact.name || contact.normalizedPhone,
        phone: '+' + contact.normalizedPhone,
        kanbanOrder: order,
        comments: 'Importado via WhatsApp',
      });
    }

    // 7. Batch insert
    try {
      const createdCustomers = await this.customerRepository.saveMany(
        customerEntities as Customer[],
      );
      this.logger.log(
        `Successfully synced ${createdCustomers.length} new WhatsApp contacts for user ${userId}`,
      );

      report.success = createdCustomers.length;
      for (const customer of customerEntities) {
        report.details.push({
          phone: customer.phone as string,
          name: customer.name,
          status: 'success',
        });
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to batch insert WhatsApp contacts for user ${userId}`,
        error,
      );

      for (const customer of customerEntities) {
        report.errors++;
        report.details.push({
          phone: customer.phone as string,
          name: customer.name,
          status: 'error',
          reason: error.message || 'Database insert failed',
        });
      }
    }

    return report;
  }
}
