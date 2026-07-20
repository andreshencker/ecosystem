export declare class DepositAccountDto {
    bsb?: string;
    accountNumber?: string;
}
export declare class UpdateBusinessDto {
    businessName?: string;
    abn?: string;
    depositAccount?: DepositAccountDto;
    defaultCurrency?: string;
}
