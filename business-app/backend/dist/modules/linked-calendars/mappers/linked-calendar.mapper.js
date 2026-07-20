"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkedCalendarMapper = void 0;
class LinkedCalendarMapper {
    static toResponse(doc) {
        const d = doc;
        const toISO = (v) => v instanceof Date ? v.toISOString() : String(v ?? '');
        return {
            id: String(d._id ?? d.id),
            companyId: d.companyId,
            connectionId: d.connectionId,
            providerKey: d.providerKey,
            providerDisplayName: d.providerDisplayName,
            accountIdentifier: d.accountIdentifier,
            externalCalendarId: d.externalCalendarId,
            calendarName: d.calendarName,
            calendarDescription: d.calendarDescription ?? null,
            timezone: d.timezone ?? null,
            accessRole: d.accessRole ?? null,
            isPrimary: d.isPrimary ?? false,
            status: d.status,
            flow: d.flow ?? null,
            linkedByUserId: d.linkedByUserId ?? null,
            createdAt: toISO(d.createdAt),
            updatedAt: toISO(d.updatedAt),
        };
    }
    static toResponseList(docs) {
        return (docs ?? []).map((d) => LinkedCalendarMapper.toResponse(d));
    }
}
exports.LinkedCalendarMapper = LinkedCalendarMapper;
//# sourceMappingURL=linked-calendar.mapper.js.map