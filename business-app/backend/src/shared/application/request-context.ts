export interface RequestContext {
  tenantId: string;
  userId: string | undefined;
  correlationId: string;
  locale: string | undefined;
  timezone: string | undefined;
  ip: string | undefined;
  userAgent: string | undefined;
}
