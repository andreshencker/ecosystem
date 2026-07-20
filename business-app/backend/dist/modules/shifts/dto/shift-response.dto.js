"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toShiftResponse = toShiftResponse;
function toShiftResponse(doc) {
    const d = doc;
    const toISO = (v) => v instanceof Date ? v.toISOString() : String(v ?? '');
    return {
        id: String(d._id),
        businessId: d.businessId,
        contractId: d.contractId ?? null,
        customerId: d.customerId ?? null,
        date: d.date,
        startTime: d.startTime,
        endDate: d.endDate ?? null,
        endTime: d.endTime,
        breakMinutes: d.breakMinutes ?? null,
        status: d.status,
        location: d.location ?? null,
        notes: d.notes ?? null,
        createdFromCalendar: d.createdFromCalendar ?? false,
        contractAssigned: d.contractAssigned ?? false,
        syncStatus: d.syncStatus ?? null,
        linkedCalendarId: d.linkedCalendarId ?? null,
        calendarProvider: d.calendarProvider ?? null,
        calendarAccount: d.calendarAccount ?? null,
        calendarName: d.calendarName ?? null,
        title: d.title ?? null,
        allDay: d.allDay ?? false,
        timezone: d.timezone ?? null,
        createdAt: toISO(d.createdAt),
        updatedAt: toISO(d.updatedAt),
    };
}
//# sourceMappingURL=shift-response.dto.js.map