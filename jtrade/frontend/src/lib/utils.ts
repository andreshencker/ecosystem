// src/lib/utils.ts

/** Pausa async (útil en demos, reintentos, etc.) */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normaliza un error (Axios/Fetch/Error) a string legible para UI */
export function errorToMessage(err: unknown, fallback = "Something went wrong") {
    // axios error shape
    const anyErr = err as any;
    const msg =
        anyErr?.response?.data?.message ||
        anyErr?.response?.data?.error ||
        anyErr?.message ||
        fallback;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.join(", ");
    return fallback;
}

/** Join condicional de clases */
export function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

/** Aserción para exhaustive checks con TypeScript */
export function assertNever(x: never, message = "Unexpected variant"): never {
    throw new Error(`${message}: ${String(x)}`);
}

/** Utilidad simple para pick */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const out = {} as Pick<T, K>;
    keys.forEach((k) => (out[k] = obj[k]));
    return out;
}

/** Utilidad simple para omit */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const set = new Set(keys);
    return Object.fromEntries(Object.entries(obj).filter(([k]) => !set.has(k as K))) as Omit<T, K>;
}

/** Verifica si parece un ObjectId de Mongo */
export function isMongoId(v: string) {
    return /^[a-f0-9]{24}$/i.test(v);
}