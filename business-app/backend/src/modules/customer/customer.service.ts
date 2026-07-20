import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument, type DocumentType } from './schemas/customer.schema';
import type {
  CustomerCommPurposeDto,
  CommPurposeChannelDto,
  EmbeddedContactDto,
  EmbeddedLocationDto,
} from './dto/create-customer.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { CustomerCreatedEvent } from './events/customer-created.event';
import { CustomerUpdatedEvent } from './events/customer-updated.event';
import { CustomerDeactivatedEvent } from './events/customer-deactivated.event';

export interface CustomerListParams {
  page: number;
  limit: number;
  search?: string;
  active?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a Contact sub-document from an EmbeddedContactDto.
 * `builtLocations` is the already-processed locations array for this document;
 * when provided, `dto.locationIndex` is resolved to the matching location's _id.
 */
function buildEmbeddedContact(
  dto: EmbeddedContactDto,
  builtLocations?: Array<{ _id: Types.ObjectId }>,
) {
  let locationId: string | null = null;
  if (
    dto.locationIndex != null &&
    builtLocations != null &&
    dto.locationIndex >= 0 &&
    dto.locationIndex < builtLocations.length
  ) {
    locationId = String(builtLocations[dto.locationIndex]._id);
  }
  return {
    _id:        new Types.ObjectId(),
    firstName:  dto.firstName.trim(),
    lastName:   (dto.lastName ?? '').trim(),
    email:      dto.email ? dto.email.toLowerCase().trim() : null,
    phone:      dto.phone ?? null,
    role:       dto.role ?? null,
    isPrimary:  dto.isPrimary ?? false,
    locationId,
  };
}

/**
 * Derive a PrimaryContact object from the first isPrimary entry in contacts[].
 * Returns null when no primary contact is designated.
 */
function derivePrimaryContact(contacts: EmbeddedContactDto[]): { name: string | null; email: string | null; phone: string | null } | null {
  const primary = contacts.find((c) => c.isPrimary);
  if (!primary) return null;
  const name = [primary.firstName, primary.lastName].filter(Boolean).join(' ').trim() || null;
  return {
    name,
    email: primary.email ? primary.email.toLowerCase().trim() : null,
    phone: primary.phone ?? null,
  };
}

@Injectable()
export class CustomerService {
  constructor(
    @InjectModel(Customer.name)
    private readonly model: Model<CustomerDocument>,
    private readonly outbox: OutboxService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Normalise a locations array before persisting.
   * Preserves an existing `_id` when `l.id` is a valid ObjectId (update path),
   * so contact locationId references remain stable across saves.
   */
  private buildLocations(locs: EmbeddedLocationDto[] | undefined) {
    return (locs ?? []).map((l) => {
      const existingId = l.id && Types.ObjectId.isValid(l.id)
        ? new Types.ObjectId(l.id)
        : null;
      return {
        _id:        existingId ?? new Types.ObjectId(),
        tag:        l.tag.trim(),
        country:    l.country.trim(),
        line1:      l.line1.trim(),
        line2:      l.line2 ? l.line2.trim() : null,
        city:       l.city.trim(),
        postalCode: l.postalCode.trim(),
        state:      l.state ? l.state.trim() : null,
      };
    });
  }

  /** Normalise and validate a communicationPurposes array before persisting. */
  private buildCommPurposes(purposes: CustomerCommPurposeDto[] | undefined) {
    return (purposes ?? []).map((p) => ({
      communicationDomainId: p.communicationDomainId.trim(),
      channels: (p.channels ?? []).map((ch) => ({
        channel:    ch.channel,
        recipients: (ch.recipients ?? []).map((r) => ({
          email:         r.email ? r.email.toLowerCase().trim() : undefined,
          recipientType: r.recipientType,
          phone:         r.phone ? r.phone.trim() : undefined,
        })),
      })),
    }));
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  private assertBillingRecipients(
    recipients: { documentType?: string; email: string; recipientType: 'to' | 'cc' | 'bcc' }[] | undefined,
  ): void {
    if (!recipients || recipients.length === 0) return;
    const hasTo = recipients.some((r) => r.recipientType === 'to');
    if (!hasTo) {
      throw new BadRequestException(
        'billingRecipients must contain at least one recipient with recipientType "to"',
      );
    }
  }

  async create(
    companyId: string,
    dto: CreateCustomerDto,
  ): Promise<CustomerDocument> {
    this.assertBillingRecipients(dto.billingRecipients);

    // Build locations first so contacts can resolve locationIndex → _id.
    const builtLocations = this.buildLocations(dto.locations);

    // Build contacts[] and derive the primary contact field.
    // `dto.contacts` (new model) takes precedence over `dto.contact` (legacy).
    let contactsArray: ReturnType<typeof buildEmbeddedContact>[] = [];
    let primaryContactField: { name: string | null; email: string | null; phone: string | null } | null = null;

    if (dto.contacts && dto.contacts.length > 0) {
      contactsArray = dto.contacts.map((c) => buildEmbeddedContact(c, builtLocations));
      primaryContactField = derivePrimaryContact(dto.contacts);
    } else if (dto.contact) {
      primaryContactField = {
        name:  dto.contact.name?.trim() ?? null,
        email: dto.contact.email ? dto.contact.email.toLowerCase().trim() : null,
        phone: dto.contact.phone ?? null,
      };
    }

    const doc = await this.model.create({
      companyId,
      type:        dto.type,
      displayName: dto.displayName.trim(),
      abn:         dto.abn ?? null,
      contact:     primaryContactField,
      address: dto.address
        ? {
            country:    dto.address.country,
            state:      dto.address.state      ?? null,
            city:       dto.address.city,
            postalCode: dto.address.postalCode ?? null,
            line1:      dto.address.line1,
            line2:      dto.address.line2      ?? null,
          }
        : null,
      notes:        dto.notes ?? null,
      isActive:     true,
      contacts:     contactsArray,
      locations:    builtLocations,
      communicationPurposes: this.buildCommPurposes(dto.communicationPurposes),
      billingRecipients: (dto.billingRecipients ?? []).map((r) => ({
        documentType:  (r.documentType ?? 'invoice') as DocumentType,
        email:         r.email,
        recipientType: r.recipientType,
      })),
    });

    await this.outbox.append(
      new CustomerCreatedEvent({
        aggregateId: String(doc._id),
        tenantId: companyId,
        payload: {
          businessId:   companyId,
          customerId:   String(doc._id),
          displayName:  doc.displayName,
          customerType: doc.type,
          abn:          doc.abn,
          email:        doc.contact?.email ?? doc.email ?? null,
          isActive:     doc.isActive,
          createdAt:
            (doc as any).createdAt instanceof Date
              ? (doc as any).createdAt.toISOString()
              : new Date().toISOString(),
          updatedAt:
            (doc as any).updatedAt instanceof Date
              ? (doc as any).updatedAt.toISOString()
              : new Date().toISOString(),
        },
      }),
    );

    return doc;
  }

  async findAll(
    companyId: string,
    params: CustomerListParams,
  ): Promise<{
    items: CustomerDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit, search, active } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { companyId };
    if (active !== undefined) filter.isActive = active;
    if (search?.trim()) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [
        { displayName: re },
        { 'contact.name': re },
        { 'contact.email': re },
        { 'contacts.firstName': re },
        { 'contacts.email': re },
        { email: re },
        { abn: re },
      ];
    }

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ displayName: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec() as any,
      this.model.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findById(
    id: string,
    companyId: string,
  ): Promise<CustomerDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findOne({ _id: id, companyId }).lean().exec();
  }

  async findByIdOrThrow(
    id: string,
    companyId: string,
  ): Promise<CustomerDocument> {
    const doc = await this.findById(id, companyId);
    if (!doc) throw new NotFoundException('Customer not found');
    return doc;
  }

  async update(
    id: string,
    companyId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerDocument> {
    await this.findByIdOrThrow(id, companyId);

    const changedFields: string[] = [];
    const $set: Record<string, any> = {};

    // Build locations first so contacts can resolve locationIndex → _id.
    const builtLocs = dto.locations !== undefined
      ? this.buildLocations(dto.locations)
      : undefined;

    if (dto.displayName !== undefined) {
      $set.displayName = dto.displayName.trim();
      changedFields.push('displayName');
    }
    if (dto.abn !== undefined) {
      $set.abn = dto.abn;
      changedFields.push('abn');
    }
    // Unified contacts[] replacement (new canonical path).
    // Uses already-built locations (if provided) so locationIndex resolves correctly.
    if (dto.contacts !== undefined) {
      $set.contacts = dto.contacts.map((c) => buildEmbeddedContact(c, builtLocs));
      const primary = derivePrimaryContact(dto.contacts);
      if (primary) $set.contact = primary;
      changedFields.push('contacts');
    } else if (dto.contact !== undefined) {
      // Legacy single-contact path
      if (dto.contact.name  !== undefined) $set['contact.name']  = dto.contact.name.trim();
      if (dto.contact.email !== undefined) $set['contact.email'] = dto.contact.email.toLowerCase().trim();
      if (dto.contact.phone !== undefined) $set['contact.phone'] = dto.contact.phone;
      changedFields.push('contact');
    }
    if (dto.notes !== undefined) {
      $set.notes = dto.notes;
      changedFields.push('notes');
    }
    if (dto.address !== undefined) {
      $set.address = {
        country:    dto.address.country,
        state:      dto.address.state      ?? null,
        city:       dto.address.city,
        postalCode: dto.address.postalCode ?? null,
        line1:      dto.address.line1,
        line2:      dto.address.line2      ?? null,
      };
      changedFields.push('address');
    }
    if (builtLocs !== undefined) {
      $set.locations = builtLocs;
      changedFields.push('locations');
    }
    if (dto.communicationPurposes !== undefined) {
      $set.communicationPurposes = this.buildCommPurposes(dto.communicationPurposes);
      changedFields.push('communicationPurposes');
    }
    if (dto.billingRecipients !== undefined) {
      this.assertBillingRecipients(dto.billingRecipients);
      $set.billingRecipients = dto.billingRecipients.map((r) => ({
        documentType:  (r.documentType ?? 'invoice') as DocumentType,
        email:         r.email,
        recipientType: r.recipientType,
      }));
      changedFields.push('billingRecipients');
    }

    const updated = await this.model
      .findOneAndUpdate({ _id: id, companyId }, { $set }, { new: true })
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Customer not found');

    await this.outbox.append(
      new CustomerUpdatedEvent({
        aggregateId: id,
        tenantId: companyId,
        payload: {
          businessId:   companyId,
          customerId:   id,
          displayName:  (updated as any).displayName,
          abn:          (updated as any).abn ?? null,
          email:        (updated as any).contact?.email ?? (updated as any).email ?? null,
          isActive:     (updated as any).isActive,
          updatedAt:
            (updated as any).updatedAt instanceof Date
              ? (updated as any).updatedAt.toISOString()
              : new Date().toISOString(),
          changedFields,
        },
      }),
    );

    return updated;
  }

  async deactivate(id: string, companyId: string): Promise<CustomerDocument> {
    const customer = await this.findByIdOrThrow(id, companyId);
    if (!(customer as any).isActive) {
      throw new BadRequestException('Customer is already inactive');
    }
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, companyId },
        { $set: { isActive: false } },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('Customer not found');

    await this.outbox.append(
      new CustomerDeactivatedEvent({
        aggregateId: id,
        tenantId: companyId,
        payload: {
          businessId:    companyId,
          customerId:    id,
          deactivatedAt: new Date().toISOString(),
        },
      }),
    );

    return updated;
  }

  async activate(id: string, companyId: string): Promise<CustomerDocument> {
    const customer = await this.findByIdOrThrow(id, companyId);
    if ((customer as any).isActive) {
      throw new BadRequestException('Customer is already active');
    }
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, companyId },
        { $set: { isActive: true } },
        { new: true },
      )
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('Customer not found');
    return updated;
  }

  async delete(id: string, companyId: string): Promise<void> {
    const result = await this.model.findOneAndDelete({ _id: id, companyId });
    if (!result) throw new NotFoundException('Customer not found');
  }

  // ─── Contacts ─────────────────────────────────────────────────────────────

  async getContacts(customerId: string, companyId: string): Promise<any[]> {
    const customer = await this.findByIdOrThrow(customerId, companyId);
    return (customer as any).contacts ?? [];
  }

  async addContact(
    customerId: string,
    companyId: string,
    dto: CreateContactDto,
  ): Promise<any> {
    await this.findByIdOrThrow(customerId, companyId);

    const contactId = new Types.ObjectId();
    const contact = {
      _id:        contactId,
      firstName:  dto.firstName.trim(),
      lastName:   (dto.lastName ?? '').trim(),
      email:      dto.email ? dto.email.toLowerCase().trim() : null,
      phone:      dto.phone ?? null,
      role:       dto.role ?? null,
      isPrimary:  dto.isPrimary ?? false,
      locationId: dto.locationId ?? null,
    };

    let updateOp: Record<string, any>;

    if (dto.isPrimary) {
      // Clear isPrimary on all existing contacts, then push the new one.
      // MongoDB doesn't support $set + $push on array items in one op,
      // so we first clear all flags, then push.
      await this.model.updateOne(
        { _id: customerId, companyId },
        { $set: { 'contacts.$[].isPrimary': false } },
      );
      // Also sync the `contact` field for backward compat
      const name = [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim() || null;
      updateOp = {
        $push: { contacts: contact },
        $set:  {
          'contact.name':  name,
          'contact.email': contact.email,
          'contact.phone': contact.phone,
        },
      };
    } else {
      updateOp = { $push: { contacts: contact } };
    }

    const updated = (await this.model
      .findOneAndUpdate({ _id: customerId, companyId }, updateOp, { new: true })
      .lean()
      .exec()) as any;

    if (!updated) throw new NotFoundException('Customer not found');
    return updated.contacts[updated.contacts.length - 1];
  }

  async updateContact(
    customerId: string,
    companyId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<any> {
    await this.findByIdOrThrow(customerId, companyId);

    if (!Types.ObjectId.isValid(contactId)) {
      throw new NotFoundException('Contact not found');
    }

    if (dto.isPrimary) {
      // Clear isPrimary on all contacts first
      await this.model.updateOne(
        { _id: customerId, companyId },
        { $set: { 'contacts.$[].isPrimary': false } },
      );
    }

    const $set: Record<string, any> = {};
    if (dto.firstName  !== undefined) $set['contacts.$.firstName']  = dto.firstName.trim();
    if (dto.lastName   !== undefined) $set['contacts.$.lastName']   = dto.lastName.trim();
    if (dto.email      !== undefined) $set['contacts.$.email']      = dto.email.toLowerCase().trim();
    if (dto.phone      !== undefined) $set['contacts.$.phone']      = dto.phone;
    if (dto.role       !== undefined) $set['contacts.$.role']       = dto.role;
    if (dto.isPrimary  !== undefined) $set['contacts.$.isPrimary']  = dto.isPrimary;
    if (dto.locationId !== undefined) $set['contacts.$.locationId'] = dto.locationId ?? null;

    const updated = (await this.model
      .findOneAndUpdate(
        { _id: customerId, companyId, 'contacts._id': new Types.ObjectId(contactId) },
        { $set },
        { new: true },
      )
      .lean()
      .exec()) as any;

    if (!updated) throw new NotFoundException('Contact not found');

    const contact = updated.contacts.find((c: any) => String(c._id) === contactId);

    // Sync `contact` field when isPrimary is set
    if (dto.isPrimary && contact) {
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || null;
      await this.model.updateOne(
        { _id: customerId, companyId },
        { $set: { 'contact.name': name, 'contact.email': contact.email, 'contact.phone': contact.phone } },
      );
    }

    return contact;
  }

  async removeContact(
    customerId: string,
    companyId: string,
    contactId: string,
  ): Promise<void> {
    await this.findByIdOrThrow(customerId, companyId);

    if (!Types.ObjectId.isValid(contactId)) {
      throw new NotFoundException('Contact not found');
    }

    const result = await this.model
      .findOneAndUpdate(
        { _id: customerId, companyId },
        { $pull: { contacts: { _id: new Types.ObjectId(contactId) } } },
        { new: true },
      )
      .lean()
      .exec();

    if (!result) throw new NotFoundException('Customer not found');
  }
}
