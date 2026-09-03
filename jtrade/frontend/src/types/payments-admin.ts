export type SettingsFieldType = "string" | "number" | "country-list";

export interface SettingsFieldDef {
    key: string;
    label: string;
    type: SettingsFieldType;
    required: boolean;
    help?: string;
}

export interface AdminPaymentMethod {
    /** DataTable row id — the method key doubles as it. */
    id?: string;
    method: string;
    displayName: string;
    description: string;
    supportedByRelay: boolean;
    configurable: boolean;
    enabled: boolean;
    isRequired: boolean;
    displayOrder: number;
    relayConnectionId: string | null;
    settings: Record<string, unknown>;
    settingsFields: SettingsFieldDef[];
}

export interface AvailableMethod {
    method: string;
    displayName: string;
    description: string;
}

export interface UpsertMethodConfigPayload {
    enabled?: boolean;
    isRequired?: boolean;
    displayName?: string;
    displayOrder?: number;
    relayConnectionId?: string;
    settings?: Record<string, unknown>;
}
