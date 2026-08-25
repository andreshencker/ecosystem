import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { RequestIdMiddleware } from './request-id.middleware';

@Global()
@Module({
  providers: [LoggerService, RequestIdMiddleware],
  exports: [LoggerService, RequestIdMiddleware],
})
export class LoggingModule {}
