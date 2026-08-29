import { api } from "@/lib/http";
import type {
    AdminSignal,
    AdminSignalsParams,
    ClientSignal,
    ClientSignalsParams,
} from "@/old/modules/core/signals/types/signals";

type Envelope<T> = {
    status?: string;
    data?: T;
};

function unwrap<T>(raw: any): T {
    if (raw && typeof raw === "object" && "data" in raw) return raw.data as T;
    return raw as T;
}

const BASE = "/signals";

function cleanParams(params?: Record<string, any>) {
    if (!params) return undefined;

    const next: Record<string, any> = {};

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            next[key] = value;
        }
    });

    return Object.keys(next).length ? next : undefined;
}

export async function listClientSignals(
    params?: ClientSignalsParams
): Promise<ClientSignal[]> {
    const { data } = await api.get<Envelope<ClientSignal[]> | ClientSignal[]>(
        `${BASE}/client/mine`,
        {
            params: cleanParams(params),
        }
    );

    return unwrap<ClientSignal[]>(data) ?? [];
}

export async function listAdminSignals(
    params?: AdminSignalsParams
): Promise<AdminSignal[]> {
    const { data } = await api.get<Envelope<AdminSignal[]> | AdminSignal[]>(
        `${BASE}/admin/history`,
        {
            params: cleanParams(params),
        }
    );

    return unwrap<AdminSignal[]>(data) ?? [];
}