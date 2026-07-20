"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const customer_schema_1 = require("./schemas/customer.schema");
const outbox_service_1 = require("../../infrastructure/outbox/outbox.service");
const customer_created_event_1 = require("./events/customer-created.event");
const customer_updated_event_1 = require("./events/customer-updated.event");
const customer_deactivated_event_1 = require("./events/customer-deactivated.event");
function buildEmbeddedContact(dto, builtLocations) {
    let locationId = null;
    if (dto.locationIndex != null &&
        builtLocations != null &&
        dto.locationIndex >= 0 &&
        dto.locationIndex < builtLocations.length) {
        locationId = String(builtLocations[dto.locationIndex]._id);
    }
    return {
        _id: new mongoose_2.Types.ObjectId(),
        firstName: dto.firstName.trim(),
        lastName: (dto.lastName ?? '').trim(),
        email: dto.email ? dto.email.toLowerCase().trim() : null,
        phone: dto.phone ?? null,
        role: dto.role ?? null,
        isPrimary: dto.isPrimary ?? false,
        locationId,
    };
}
function derivePrimaryContact(contacts) {
    const primary = contacts.find((c) => c.isPrimary);
    if (!primary)
        return null;
    const name = [primary.firstName, primary.lastName].filter(Boolean).join(' ').trim() || null;
    return {
        name,
        email: primary.email ? primary.email.toLowerCase().trim() : null,
        phone: primary.phone ?? null,
    };
}
let CustomerService = class CustomerService {
    model;
    outbox;
    constructor(model, outbox) {
        this.model = model;
        this.outbox = outbox;
    }
    buildLocations(locs) {
        return (locs ?? []).map((l) => {
            const existingId = l.id && mongoose_2.Types.ObjectId.isValid(l.id)
                ? new mongoose_2.Types.ObjectId(l.id)
                : null;
            return {
                _id: existingId ?? new mongoose_2.Types.ObjectId(),
                tag: l.tag.trim(),
                country: l.country.trim(),
                line1: l.line1.trim(),
                line2: l.line2 ? l.line2.trim() : null,
                city: l.city.trim(),
                postalCode: l.postalCode.trim(),
                state: l.state ? l.state.trim() : null,
            };
        });
    }
    buildCommPurposes(purposes) {
        return (purposes ?? []).map((p) => ({
            communicationDomainId: p.communicationDomainId.trim(),
            channels: (p.channels ?? []).map((ch) => ({
                channel: ch.channel,
                recipients: (ch.recipients ?? []).map((r) => ({
                    email: r.email ? r.email.toLowerCase().trim() : undefined,
                    recipientType: r.recipientType,
                    phone: r.phone ? r.phone.trim() : undefined,
                })),
            })),
        }));
    }
    assertBillingRecipients(recipients) {
        if (!recipients || recipients.length === 0)
            return;
        const hasTo = recipients.some((r) => r.recipientType === 'to');
        if (!hasTo) {
            throw new common_1.BadRequestException('billingRecipients must contain at least one recipient with recipientType "to"');
        }
    }
    async create(companyId, dto) {
        this.assertBillingRecipients(dto.billingRecipients);
        const builtLocations = this.buildLocations(dto.locations);
        let contactsArray = [];
        let primaryContactField = null;
        if (dto.contacts && dto.contacts.length > 0) {
            contactsArray = dto.contacts.map((c) => buildEmbeddedContact(c, builtLocations));
            primaryContactField = derivePrimaryContact(dto.contacts);
        }
        else if (dto.contact) {
            primaryContactField = {
                name: dto.contact.name?.trim() ?? null,
                email: dto.contact.email ? dto.contact.email.toLowerCase().trim() : null,
                phone: dto.contact.phone ?? null,
            };
        }
        const doc = await this.model.create({
            companyId,
            type: dto.type,
            displayName: dto.displayName.trim(),
            abn: dto.abn ?? null,
            contact: primaryContactField,
            address: dto.address
                ? {
                    country: dto.address.country,
                    state: dto.address.state ?? null,
                    city: dto.address.city,
                    postalCode: dto.address.postalCode ?? null,
                    line1: dto.address.line1,
                    line2: dto.address.line2 ?? null,
                }
                : null,
            notes: dto.notes ?? null,
            isActive: true,
            contacts: contactsArray,
            locations: builtLocations,
            communicationPurposes: this.buildCommPurposes(dto.communicationPurposes),
            billingRecipients: (dto.billingRecipients ?? []).map((r) => ({
                documentType: (r.documentType ?? 'invoice'),
                email: r.email,
                recipientType: r.recipientType,
            })),
        });
        await this.outbox.append(new customer_created_event_1.CustomerCreatedEvent({
            aggregateId: String(doc._id),
            tenantId: companyId,
            payload: {
                businessId: companyId,
                customerId: String(doc._id),
                displayName: doc.displayName,
                customerType: doc.type,
                abn: doc.abn,
                email: doc.contact?.email ?? doc.email ?? null,
                isActive: doc.isActive,
                createdAt: doc.createdAt instanceof Date
                    ? doc.createdAt.toISOString()
                    : new Date().toISOString(),
                updatedAt: doc.updatedAt instanceof Date
                    ? doc.updatedAt.toISOString()
                    : new Date().toISOString(),
            },
        }));
        return doc;
    }
    async findAll(companyId, params) {
        const { page, limit, search, active } = params;
        const skip = (page - 1) * limit;
        const filter = { companyId };
        if (active !== undefined)
            filter.isActive = active;
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
                .exec(),
            this.model.countDocuments(filter),
        ]);
        return { items, total, page, limit };
    }
    async findById(id, companyId) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            return null;
        return this.model.findOne({ _id: id, companyId }).lean().exec();
    }
    async findByIdOrThrow(id, companyId) {
        const doc = await this.findById(id, companyId);
        if (!doc)
            throw new common_1.NotFoundException('Customer not found');
        return doc;
    }
    async update(id, companyId, dto) {
        await this.findByIdOrThrow(id, companyId);
        const changedFields = [];
        const $set = {};
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
        if (dto.contacts !== undefined) {
            $set.contacts = dto.contacts.map((c) => buildEmbeddedContact(c, builtLocs));
            const primary = derivePrimaryContact(dto.contacts);
            if (primary)
                $set.contact = primary;
            changedFields.push('contacts');
        }
        else if (dto.contact !== undefined) {
            if (dto.contact.name !== undefined)
                $set['contact.name'] = dto.contact.name.trim();
            if (dto.contact.email !== undefined)
                $set['contact.email'] = dto.contact.email.toLowerCase().trim();
            if (dto.contact.phone !== undefined)
                $set['contact.phone'] = dto.contact.phone;
            changedFields.push('contact');
        }
        if (dto.notes !== undefined) {
            $set.notes = dto.notes;
            changedFields.push('notes');
        }
        if (dto.address !== undefined) {
            $set.address = {
                country: dto.address.country,
                state: dto.address.state ?? null,
                city: dto.address.city,
                postalCode: dto.address.postalCode ?? null,
                line1: dto.address.line1,
                line2: dto.address.line2 ?? null,
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
                documentType: (r.documentType ?? 'invoice'),
                email: r.email,
                recipientType: r.recipientType,
            }));
            changedFields.push('billingRecipients');
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, companyId }, { $set }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Customer not found');
        await this.outbox.append(new customer_updated_event_1.CustomerUpdatedEvent({
            aggregateId: id,
            tenantId: companyId,
            payload: {
                businessId: companyId,
                customerId: id,
                displayName: updated.displayName,
                abn: updated.abn ?? null,
                email: updated.contact?.email ?? updated.email ?? null,
                isActive: updated.isActive,
                updatedAt: updated.updatedAt instanceof Date
                    ? updated.updatedAt.toISOString()
                    : new Date().toISOString(),
                changedFields,
            },
        }));
        return updated;
    }
    async deactivate(id, companyId) {
        const customer = await this.findByIdOrThrow(id, companyId);
        if (!customer.isActive) {
            throw new common_1.BadRequestException('Customer is already inactive');
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, companyId }, { $set: { isActive: false } }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Customer not found');
        await this.outbox.append(new customer_deactivated_event_1.CustomerDeactivatedEvent({
            aggregateId: id,
            tenantId: companyId,
            payload: {
                businessId: companyId,
                customerId: id,
                deactivatedAt: new Date().toISOString(),
            },
        }));
        return updated;
    }
    async activate(id, companyId) {
        const customer = await this.findByIdOrThrow(id, companyId);
        if (customer.isActive) {
            throw new common_1.BadRequestException('Customer is already active');
        }
        const updated = await this.model
            .findOneAndUpdate({ _id: id, companyId }, { $set: { isActive: true } }, { new: true })
            .lean()
            .exec();
        if (!updated)
            throw new common_1.NotFoundException('Customer not found');
        return updated;
    }
    async delete(id, companyId) {
        const result = await this.model.findOneAndDelete({ _id: id, companyId });
        if (!result)
            throw new common_1.NotFoundException('Customer not found');
    }
    async getContacts(customerId, companyId) {
        const customer = await this.findByIdOrThrow(customerId, companyId);
        return customer.contacts ?? [];
    }
    async addContact(customerId, companyId, dto) {
        await this.findByIdOrThrow(customerId, companyId);
        const contactId = new mongoose_2.Types.ObjectId();
        const contact = {
            _id: contactId,
            firstName: dto.firstName.trim(),
            lastName: (dto.lastName ?? '').trim(),
            email: dto.email ? dto.email.toLowerCase().trim() : null,
            phone: dto.phone ?? null,
            role: dto.role ?? null,
            isPrimary: dto.isPrimary ?? false,
            locationId: dto.locationId ?? null,
        };
        let updateOp;
        if (dto.isPrimary) {
            await this.model.updateOne({ _id: customerId, companyId }, { $set: { 'contacts.$[].isPrimary': false } });
            const name = [dto.firstName, dto.lastName].filter(Boolean).join(' ').trim() || null;
            updateOp = {
                $push: { contacts: contact },
                $set: {
                    'contact.name': name,
                    'contact.email': contact.email,
                    'contact.phone': contact.phone,
                },
            };
        }
        else {
            updateOp = { $push: { contacts: contact } };
        }
        const updated = (await this.model
            .findOneAndUpdate({ _id: customerId, companyId }, updateOp, { new: true })
            .lean()
            .exec());
        if (!updated)
            throw new common_1.NotFoundException('Customer not found');
        return updated.contacts[updated.contacts.length - 1];
    }
    async updateContact(customerId, companyId, contactId, dto) {
        await this.findByIdOrThrow(customerId, companyId);
        if (!mongoose_2.Types.ObjectId.isValid(contactId)) {
            throw new common_1.NotFoundException('Contact not found');
        }
        if (dto.isPrimary) {
            await this.model.updateOne({ _id: customerId, companyId }, { $set: { 'contacts.$[].isPrimary': false } });
        }
        const $set = {};
        if (dto.firstName !== undefined)
            $set['contacts.$.firstName'] = dto.firstName.trim();
        if (dto.lastName !== undefined)
            $set['contacts.$.lastName'] = dto.lastName.trim();
        if (dto.email !== undefined)
            $set['contacts.$.email'] = dto.email.toLowerCase().trim();
        if (dto.phone !== undefined)
            $set['contacts.$.phone'] = dto.phone;
        if (dto.role !== undefined)
            $set['contacts.$.role'] = dto.role;
        if (dto.isPrimary !== undefined)
            $set['contacts.$.isPrimary'] = dto.isPrimary;
        if (dto.locationId !== undefined)
            $set['contacts.$.locationId'] = dto.locationId ?? null;
        const updated = (await this.model
            .findOneAndUpdate({ _id: customerId, companyId, 'contacts._id': new mongoose_2.Types.ObjectId(contactId) }, { $set }, { new: true })
            .lean()
            .exec());
        if (!updated)
            throw new common_1.NotFoundException('Contact not found');
        const contact = updated.contacts.find((c) => String(c._id) === contactId);
        if (dto.isPrimary && contact) {
            const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || null;
            await this.model.updateOne({ _id: customerId, companyId }, { $set: { 'contact.name': name, 'contact.email': contact.email, 'contact.phone': contact.phone } });
        }
        return contact;
    }
    async removeContact(customerId, companyId, contactId) {
        await this.findByIdOrThrow(customerId, companyId);
        if (!mongoose_2.Types.ObjectId.isValid(contactId)) {
            throw new common_1.NotFoundException('Contact not found');
        }
        const result = await this.model
            .findOneAndUpdate({ _id: customerId, companyId }, { $pull: { contacts: { _id: new mongoose_2.Types.ObjectId(contactId) } } }, { new: true })
            .lean()
            .exec();
        if (!result)
            throw new common_1.NotFoundException('Customer not found');
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(customer_schema_1.Customer.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        outbox_service_1.OutboxService])
], CustomerService);
//# sourceMappingURL=customer.service.js.map