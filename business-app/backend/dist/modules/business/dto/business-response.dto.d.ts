export declare class BusinessResponseDto {
    id: string;
    businessKey: string;
    businessName: string;
    ownerUserId: string | null;
    abn: string | null;
    depositAccount: {
        bsb: string | null;
        accountNumber: string | null;
    };
    defaultCurrency: string;
    isActive: boolean;
    isPlatformCompany: boolean;
    createdAt: string;
    updatedAt: string;
    static from(doc: Record<string, any>): BusinessResponseDto;
}
