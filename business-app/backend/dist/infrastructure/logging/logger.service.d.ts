import { LoggerService as NestLoggerService } from '@nestjs/common';
export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';
export interface LogMeta {
    requestId?: string;
    organizationId?: string;
    userId?: string;
    [key: string]: unknown;
}
export declare class LoggerService implements NestLoggerService {
    private readonly service;
    private write;
    log(message: string, context?: string, meta?: LogMeta): void;
    error(message: string, context?: string, meta?: LogMeta): void;
    warn(message: string, context?: string, meta?: LogMeta): void;
    debug(message: string, context?: string, meta?: LogMeta): void;
    verbose(message: string, context?: string, meta?: LogMeta): void;
}
