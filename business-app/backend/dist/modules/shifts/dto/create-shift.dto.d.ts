export declare class CreateShiftDto {
    contractId: string;
    linkedCalendarId?: string;
    title?: string;
    date: string;
    startTime: string;
    endTime: string;
    breakMinutes?: number;
    status?: 'draft' | 'confirmed' | 'cancelled';
    location?: string;
    notes?: string;
}
