// src/trades/utils/getActivePlatform.ts
export type ActivePlatform = {
    linkId: string;
    platformId: string;
    name: string;
    status: string;
};

export function getActivePlatformFromStorage(): ActivePlatform | null {
    try {
        const raw = localStorage.getItem("app:activePlatform");
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed?.linkId) return null;

        return parsed;
    } catch {
        return null;
    }
}