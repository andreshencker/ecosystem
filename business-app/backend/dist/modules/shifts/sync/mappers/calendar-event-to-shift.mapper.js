"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalendarEventToShiftMapper = void 0;
class CalendarEventToShiftMapper {
    static toLocalDateTime(dt, tzid) {
        const tz = tzid || 'UTC';
        try {
            const fmt = new Intl.DateTimeFormat('en-CA', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
            const parts = Object.fromEntries(fmt.formatToParts(dt).map((p) => [p.type, p.value]));
            const date = `${parts.year}-${parts.month}-${parts.day}`;
            const hour = parts.hour === '24' ? '00' : parts.hour;
            const time = `${hour}:${parts.minute}`;
            return { date, time };
        }
        catch {
            const utcFmt = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'UTC',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
                hour12: false,
            });
            const up = Object.fromEntries(utcFmt.formatToParts(dt).map((p) => [p.type, p.value]));
            return {
                date: `${up.year}-${up.month}-${up.day}`,
                time: up.hour === '24' ? `00:${up.minute}` : `${up.hour}:${up.minute}`,
            };
        }
    }
    static extractFromOffsetAwareString(isoString) {
        const match = isoString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2})?(?:\.\d+)?([+-]\d{2}:?\d{2})$/);
        if (!match)
            return null;
        const offset = match[4].replace(':', '');
        if (offset === '+0000' || offset === '-0000')
            return null;
        return { date: match[1], time: `${match[2]}:${match[3]}` };
    }
    static extractFromLocalDateTimeString(isoString) {
        const match = isoString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/);
        if (!match)
            return null;
        return { date: match[1], time: `${match[2]}:${match[3]}` };
    }
    static resolveLocalDateTime(dt, rawString, tzid) {
        const fromLocal = CalendarEventToShiftMapper.extractFromLocalDateTimeString(rawString);
        if (fromLocal)
            return fromLocal;
        if (tzid) {
            return CalendarEventToShiftMapper.toLocalDateTime(dt, tzid);
        }
        const fromOffset = CalendarEventToShiftMapper.extractFromOffsetAwareString(rawString);
        if (fromOffset)
            return fromOffset;
        return CalendarEventToShiftMapper.toLocalDateTime(dt, null);
    }
    static _logger = { log: (msg) => process.stdout.write(`[SHIFT_MAPPER] ${msg}\n`) };
    static map(event, calendar) {
        if (!event.startAt)
            return null;
        CalendarEventToShiftMapper._logger.log(`BUSINESS_APP_SYNC_RECEIVED | eventId=${event.id} calendarId=${event.calendarId} ` +
            `startAt=${event.startAt} endAt=${event.endAt ?? 'undefined'} ` +
            `event.timeZone=${event.timeZone ?? 'undefined'} calendar.timezone=${calendar.timezone ?? 'null'}`);
        const start = new Date(event.startAt);
        const end = event.endAt ? new Date(event.endAt) : start;
        if (isNaN(start.getTime()))
            return null;
        const tzid = event.timeZone ?? calendar.timezone;
        let date;
        let startTime;
        let endTime;
        let endDate;
        if (event.allDay) {
            date = event.startAt.slice(0, 10);
            endDate = event.endAt ? event.endAt.slice(0, 10) : date;
            startTime = '00:00';
            endTime = '23:59';
        }
        else {
            const startLocal = CalendarEventToShiftMapper.resolveLocalDateTime(start, event.startAt, tzid);
            const endRaw = event.endAt ?? event.startAt;
            const endLocal = CalendarEventToShiftMapper.resolveLocalDateTime(end, endRaw, tzid);
            date = startLocal.date;
            startTime = startLocal.time;
            endDate = endLocal.date;
            endTime = endLocal.time;
        }
        CalendarEventToShiftMapper._logger.log(`BUSINESS_APP_SHIFT_NORMALIZED | eventId=${event.id} ` +
            `resolvedTzid=${tzid ?? 'null'} ` +
            `date=${date} startTime=${startTime} endDate=${endDate} endTime=${endTime}`);
        return {
            linkedCalendarId: calendar.id,
            calendarProvider: calendar.providerKey,
            calendarAccount: calendar.accountIdentifier,
            calendarId: calendar.externalCalendarId,
            calendarName: calendar.calendarName,
            externalEventId: event.uid ?? event.id,
            externalOccurrenceId: event.id,
            date,
            startTime,
            endDate,
            endTime,
            title: event.title || '(no title)',
            description: event.description ?? null,
            location: event.location ?? null,
            start,
            end,
            allDay: event.allDay ?? false,
            timezone: tzid ?? null,
            organizer: event.organizerEmail ?? null,
            attendees: (event.attendees ?? []).map((a) => a.email).filter(Boolean),
            lastExternalUpdate: event.raw?.lastModified
                ? new Date(event.raw.lastModified)
                : null,
            syncStatus: 'synced',
            createdFromCalendar: true,
            contractAssigned: false,
            hourCalculationStatus: 'pending',
            invoiceStatus: 'pending',
            status: 'draft',
            contractId: null,
            customerId: null,
            metadata: event.raw ?? null,
        };
    }
}
exports.CalendarEventToShiftMapper = CalendarEventToShiftMapper;
//# sourceMappingURL=calendar-event-to-shift.mapper.js.map