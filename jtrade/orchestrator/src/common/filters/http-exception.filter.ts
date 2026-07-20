// src/common/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: any = 'Internal server error';

    if (isHttp) {
      const res = exception.getResponse();
      // res puede ser string o un objeto { message, error, ... }
      message =
        typeof res === 'string'
          ? res
          : ((res as any).message ?? res ?? 'Unexpected error');
    } else if ((exception as any)?.message) {
      message = (exception as any).message;
    }

    response.status(status).json({
      status: 'error',
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
