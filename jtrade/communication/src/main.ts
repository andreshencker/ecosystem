// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,PUT,DELETE,PATCH',
    allowedHeaders: 'Content-Type, Authorization, x-api-key', // ✅
  });

  // Validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Communication Service')
    .setDescription(
      'Microservicio de comunicación (emails, files, plantillas).',
    )
    .setVersion('1.0.0')
    // si NO usas JWT aquí, puedes quitar addBearerAuth()
    .addBearerAuth()
    // ✅ API KEY como en tus controllers/guard
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Puerto
  const port =
    config.get<number>('COMMUNICATION_PORT') ||
    Number(process.env.COMMUNICATION_PORT) ||
    3001;

  await app.listen(port);

  console.log(
    `🚀 Communication Service running at: http://54.166.195.143:${port}`,
  );
  console.log(`📘 Swagger docs available at: http://54.166.195.143:${port}/docs`);
  // 🔹 LOG DE LA BD USANDO LA CONEXIÓN DE MONGOOSE
  const connection = app.get<Connection>(getConnectionToken());
  console.log(`🍃 MongoDB connected successfully to: ${connection.name}`);
}

bootstrap();
