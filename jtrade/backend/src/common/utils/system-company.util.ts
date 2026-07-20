// src/common/utils/system-company.util.ts
export function getSystemCompanyId(): string {
  return String(process.env.SYSTEM_COMPANY_ID ?? '').trim();
}
