"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCustomerResponse = toCustomerResponse;
function mapLocation(l) {
    return {
        id: String(l._id),
        tag: l.tag,
        country: l.country,
        line1: l.line1,
        line2: l.line2 ?? null,
        city: l.city,
        postalCode: l.postalCode,
        state: l.state ?? null,
    };
}
function buildLocations(doc) {
    const stored = doc.locations ?? [];
    if (stored.length > 0)
        return stored.map(mapLocation);
    if (doc.address) {
        const a = doc.address;
        return [{
                id: 'legacy-address',
                tag: 'Main Address',
                country: a.country,
                line1: a.line1,
                line2: a.line2 ?? null,
                city: a.city,
                postalCode: a.postalCode ?? '',
                state: a.state ?? null,
            }];
    }
    return [];
}
function mapCommPurpose(p) {
    return {
        communicationDomainId: p.communicationDomainId,
        channels: (p.channels ?? []).map((ch) => ({
            channel: ch.channel,
            recipients: (ch.recipients ?? []).map((r) => ({
                email: r.email ?? undefined,
                recipientType: r.recipientType ?? undefined,
                phone: r.phone ?? undefined,
            })),
        })),
    };
}
function mapBillingRecipient(r) {
    return {
        documentType: r.documentType ?? 'invoice',
        email: r.email,
        recipientType: r.recipientType ?? r.type ?? 'to',
    };
}
function mapContact(c) {
    return {
        id: String(c._id),
        firstName: c.firstName,
        lastName: c.lastName ?? '',
        email: c.email,
        phone: c.phone,
        role: c.role,
        isPrimary: c.isPrimary ?? false,
        locationId: c.locationId ?? null,
    };
}
function mapPrimaryContact(doc) {
    const primaryContact = (doc.contacts ?? []).find((c) => c.isPrimary);
    if (primaryContact) {
        const fullName = [primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(' ');
        return {
            name: fullName || null,
            email: primaryContact.email ?? null,
            phone: primaryContact.phone ?? null,
        };
    }
    if (doc.contact) {
        return {
            name: doc.contact.name ?? null,
            email: doc.contact.email ?? null,
            phone: doc.contact.phone ?? null,
        };
    }
    return {
        name: null,
        email: doc.email ?? null,
        phone: doc.phone ?? null,
    };
}
function buildContacts(doc) {
    const stored = doc.contacts ?? [];
    const hasPrimaryInArray = stored.some((c) => c.isPrimary);
    if (hasPrimaryInArray || !doc.contact) {
        return stored.map(mapContact);
    }
    const legacy = doc.contact;
    const syntheticName = legacy.name ?? '';
    const synthetic = {
        id: 'legacy-primary',
        firstName: syntheticName,
        lastName: '',
        email: legacy.email ?? null,
        phone: legacy.phone ?? null,
        role: null,
        isPrimary: true,
        locationId: null,
    };
    return [synthetic, ...stored.map(mapContact)];
}
function mapAddress(a) {
    if (!a)
        return null;
    return {
        country: a.country,
        state: a.state ?? null,
        city: a.city,
        postalCode: a.postalCode ?? null,
        line1: a.line1,
        line2: a.line2 ?? null,
    };
}
function toCustomerResponse(doc) {
    const d = doc;
    return {
        id: String(d._id),
        companyId: d.companyId,
        type: d.type,
        displayName: d.displayName,
        abn: d.abn ?? null,
        contact: mapPrimaryContact(d),
        address: mapAddress(d.address),
        notes: d.notes ?? null,
        isActive: d.isActive,
        contacts: buildContacts(d),
        locations: buildLocations(d),
        communicationPurposes: (d.communicationPurposes ?? []).map(mapCommPurpose),
        billingRecipients: (d.billingRecipients ?? []).map(mapBillingRecipient),
        createdAt: d.createdAt instanceof Date
            ? d.createdAt.toISOString()
            : String(d.createdAt ?? ''),
        updatedAt: d.updatedAt instanceof Date
            ? d.updatedAt.toISOString()
            : String(d.updatedAt ?? ''),
    };
}
//# sourceMappingURL=customer-response.dto.js.map