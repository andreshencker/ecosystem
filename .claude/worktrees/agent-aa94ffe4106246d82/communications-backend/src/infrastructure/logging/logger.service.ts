import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export interface LogMeta {
  requestId?: string;
  organizationId?: string;
  userId?: string;
  [key: string]: unknown;
}

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService implements NestLoggerService {
  private readonly service: string = 'communication-platform';

  private write(level: LogLevel, message: string, context?: string, meta?: LogMeta): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      context: context ?? 'App',
      message,
      ...(meta ?? {}),
    };

    const line = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }

  log(message: string, context?: string, meta?: LogMeta): void {
    this.write('log', message, context, meta);
  }

  error(message: string, context?: string, meta?: LogMeta): void {
    this.write('error', message, context, meta);
  }

  warn(message: string, context?: string, meta?: LogMeta): void {
    this.write('warn', message, context, meta);
  }

  debug(message: string, context?: string, meta?: LogMeta): void {
    this.write('debug', message, context, meta);
  }

  verbose(message: string, context?: string, meta?: LogMeta): void {
    this.write('verbose', message, context, meta);
  }
}
