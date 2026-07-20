import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

//import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const PORT = config.get<number>('PORT') || 3003;
  const CONTEXT_PATH = process.env.CONTEXT_PATH || '/orchestrator';

  /*  // 🔹 Habilitar CORS para el front (Vite en 5173)
  app.enableCors({
    origin: ['http://54.166.195.143:5173'], // tu frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false, // si luego pasas cookies o auth por origin, aquí se pone true
  });*/

  app.useGlobalFilters(new HttpExceptionFilter());
  //app.useGlobalInterceptors(new ResponseInterceptor());
  app.setGlobalPrefix(CONTEXT_PATH);
  await app.listen(PORT);

  console.log(`🚀 Server running at: http://54.166.195.143:${PORT}`);

  const connection = app.get<Connection>(getConnectionToken());
  console.log(`🍃 MongoDB connected successfully to: ${connection.name}`);
}

bootstrap();
