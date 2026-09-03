export type PaymentMethodStatus = "pending" | "complete" | "restricted";

export interface ProviderPaymentMethod {
    method: string;
    status: PaymentMethodStatus;
    isBase: boolean;
    providerAccountId: string | null;
    requirementsDue: string[];
    disabledReason: string | null;
    lastCheckedAt: string | null;
}

export interface AvailableMethod {
    method: string;
    displayName: string;
    description: string;
}

export interface PaymentsOnboardingStatus {
    baseMethod: string;
    baseStatus: PaymentMethodStatus | null;
    baseComplete: boolean;
    canAddMore: boolean;
    methods: ProviderPaymentMethod[];
    availableToAdd: AvailableMethod[];
}

export interface StartMethodResult {
    onboardingUrl: string;
    status: string;
    resumed: boolean;
}
