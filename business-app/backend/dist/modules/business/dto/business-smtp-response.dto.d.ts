export declare class BusinessSmtpResponseDto {
    companyId: string;
    fromEmail: string;
    fromName: string;
    hasCredentials: boolean;
    isActive: boolean;
    verifiedAt: Date | null;
    static from(doc: any): BusinessSmtpResponseDto;
}
