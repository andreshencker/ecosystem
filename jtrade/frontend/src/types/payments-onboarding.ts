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
    /** false when the admin hasn't finished configuring the required method. */
    configReady: boolean;
    canAddMore: boolean;
    /** [] = no country choice needed, [..] = provider picks one. */
    requiredCountryChoice: string[];
    methods: ProviderPaymentMethod[];
    availableToAdd: AvailableMethod[];
}

export interface StartMethodResult {
    onboardingUrl: string;
    status: string;
    resumed: boolean;
}
