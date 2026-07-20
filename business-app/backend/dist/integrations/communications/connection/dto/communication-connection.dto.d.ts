export declare class SaveConnectionDto {
    token: string;
    isActive?: boolean;
}
export declare class TestConnectionDto {
    token?: string;
}
export declare class ToggleConnectionDto {
    isActive: boolean;
}
export declare class IntegrationConnectionResponseDto {
    id: string;
    provider: string;
    tokenPrefix: string;
    isActive: boolean;
    remoteCompanyId: string | null;
    lastTestedAt: string | null;
    lastStatus: 'connected' | 'failed' | null;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
    static from(doc: any): IntegrationConnectionResponseDto;
}
