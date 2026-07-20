export declare class UpdateDepositAccountDto {
    bsb?: string;
    accountNumber?: string;
}
export declare class UpdateFiscalProfileDto {
    abn?: string;
    depositAccount?: UpdateDepositAccountDto;
    defaultCurrency?: string;
}
export interface FiscalProfileResponseDto {
    companyId: string;
    abn: string | null;
    depositAccount: {
        bsb: string | null;
        accountNumber: string | null;
    };
    defaultCurrency: string;
}
