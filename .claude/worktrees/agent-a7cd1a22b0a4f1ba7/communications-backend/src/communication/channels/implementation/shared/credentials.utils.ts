import { CredentialsValidationError } from './credentials.errors';

export function str(v: any): string {
  return v === undefined || v === null ? '' : String(v);
}

export function strTrim(v: any): string {
  return str(v).trim();
}

export function bool(v: any): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  const s = strTrim(v).toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return undefined;
}

export function num(v: any): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Solo deja las keys permitidas para evitar guardar "cosas que no son". */
export function pick<T extends Record<string, any>>(
  obj: any,
  allowed: (keyof T)[],
): Partial<T> {
  const out: any = {};
  for (const k of allowed) {
    if (obj?.[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export function requireField(value: any, field: string, msg?: string) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new CredentialsValidationError(
      msg ?? `Missing required field: ${field}`,
      field,
    );
  }
}

export function requireOneOf(value: any, field: string, allowed: string[]) {
  requireField(value, field);
  const v = String(value).toLowerCase().trim();
  if (!allowed.includes(v)) {
    throw new CredentialsValidationError(
      `Invalid ${field}. Allowed: ${allowed.join(', ')}`,
      field,
    );
  }
}

export function isEmailLike(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * ✅ Helpers usados por factory / routing
 */
export function trimOrUndef(v: any): string | undefined {
  const s = strTrim(v);
  return s.length ? s : undefined;
}

export function lowerTrim(v: any): string {
  return strTrim(v).toLowerCase();
}
