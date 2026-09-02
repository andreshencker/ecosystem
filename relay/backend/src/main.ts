import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

async function bootstrap() {
  // rawBody: true makes req.rawBody available for webhook signature verification
  // without disabling the global JSON body parser.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  // Behind a reverse proxy in prod — trust X-Forwarded-* headers so OAuth
  // callback URLs are built with https and the real host.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // CORS — restrict to known origins via ALLOWED_ORIGINS env variable
  const allowedOrigins = config
    .get<string>('ALLOWED_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: 'GET,POST,PUT,DELETE,PATCH',
    allowedHeaders: 'Content-Type, Authorization, x-api-key',
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Communication Platform')
    .setDescription(
      'Communication Platform API — emails, SMS, files, templates.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Port
  const port = config.get<number>('PORT') || Number(process.env.PORT) || 3001;

  await app.listen(port);

  const connection = app.get<Connection>(getConnectionToken());
  console.log(`Communication Platform running on port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
  console.log(`MongoDB connected to: ${connection.name}`);
}

bootstrap();
