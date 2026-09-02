// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const config = app.get(ConfigService);
  const PORT = config.get<number>('PORT') || 3002;

  // ✅ IMPORTANTE: que en dev tu ENV ponga CONTEXT_PATH=/backend
  const CONTEXT_PATH = process.env.CONTEXT_PATH || '/backend';

  // Behind a reverse proxy in prod — trust X-Forwarded-* headers.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ✅ CORS (DEV + PROD)
  // Dev defaults + any extra origins from ALLOWED_ORIGINS (comma-separated,
  // e.g. "https://jtrade.grapifly.com").
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    ...(config.get<string>('ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requests sin Origin (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: false, // ✅ usamos Bearer token, no cookies
    optionsSuccessStatus: 204,
  });

  // ✅ Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const details = errors.flatMap((e) =>
          Object.values(e.constraints ?? {}),
        );
        console.error('[ValidationError]', JSON.stringify(errors, null, 2));
        return new BadRequestException(
          details.length ? details : 'Validation failed',
        );
      },
    }),
  );

  // ✅ Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Binance Futures API')
    .setDescription('API para consultar Binance Futures y persistir en MongoDB')
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API key interna (opcional)',
      },
      'internal',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: '/docs/json' });

  // ✅ Prefijo global
  app.setGlobalPrefix(CONTEXT_PATH);

  await app.listen(PORT, '0.0.0.0');

  console.log(`🚀 Server running at: http://localhost:${PORT}${CONTEXT_PATH}`);
  const connection = app.get<Connection>(getConnectionToken());
  console.log(`🍃 MongoDB connected successfully to: ${connection.name}`);
  console.log(`📘 Swagger docs:  http://localhost:${PORT}/docs`);
}

bootstrap();
