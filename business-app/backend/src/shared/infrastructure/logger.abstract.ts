export interface LogMeta {
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export abstract class AppLogger {
  abstract log(message: string, context?: string, meta?: LogMeta): void;
  abstract error(message: string, context?: string, meta?: LogMeta): void;
  abstract warn(message: string, context?: string, meta?: LogMeta): void;
  abstract debug(message: string, context?: string, meta?: LogMeta): void;
}
