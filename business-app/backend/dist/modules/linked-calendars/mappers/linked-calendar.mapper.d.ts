import type { LinkedCalendarDocument } from '../schemas/linked-calendar.schema';
import type { LinkedCalendarResponseDto } from '../dto/linked-calendar-response.dto';
export declare class LinkedCalendarMapper {
    static toResponse(doc: LinkedCalendarDocument | Record<string, any>): LinkedCalendarResponseDto;
    static toResponseList(docs: Array<LinkedCalendarDocument | Record<string, any>>): LinkedCalendarResponseDto[];
}
