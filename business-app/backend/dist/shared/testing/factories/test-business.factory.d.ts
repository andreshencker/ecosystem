export interface TestBusiness {
    id: string;
    businessKey: string;
    businessName: string;
    tenantId: string;
    ownerUserId: string | null;
    defaultCurrency: string;
    isActive: boolean;
}
export declare function createTestBusiness(overrides?: Partial<TestBusiness>): TestBusiness;
