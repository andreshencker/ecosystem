import type { LinkedCalendarDocument } from '../schemas/linked-calendar.schema';
import type { LinkedCalendarResponseDto } from '../dto/linked-calendar-response.dto';

export class LinkedCalendarMapper {
  static toResponse(doc: LinkedCalendarDocument | Record<string, any>): LinkedCalendarResponseDto {
    const d = doc as any;
    const toISO = (v: any): string =>
      v instanceof Date ? v.toISOString() : String(v ?? '');

    return {
      id:                  String(d._id ?? d.id),
      companyId:           d.companyId,
      connectionId:        d.connectionId,
      providerKey:         d.providerKey,
      providerDisplayName: d.providerDisplayName,
      accountIdentifier:   d.accountIdentifier,
      externalCalendarId:  d.externalCalendarId,
      calendarName:        d.calendarName,
      calendarDescription: d.calendarDescription ?? null,
      timezone:            d.timezone ?? null,
      accessRole:          d.accessRole ?? null,
      isPrimary:           d.isPrimary ?? false,
      status:              d.status,
      flow:                d.flow ?? null,
      linkedByUserId:      d.linkedByUserId ?? null,
      createdAt:           toISO(d.createdAt),
      updatedAt:           toISO(d.updatedAt),
    };
  }

  static toResponseList(docs: Array<LinkedCalendarDocument | Record<string, any>>): LinkedCalendarResponseDto[] {
    return (docs ?? []).map((d) => LinkedCalendarMapper.toResponse(d));
  }
}
