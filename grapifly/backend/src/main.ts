import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100';

  app.use(cookieParser());
  app.enableCors({ origin: frontendUrl, credentials: true });
  const port = config.get<number>('PORT') ?? 3101;
  await app.listen(port);
  console.log(`Grapifly ID running on port ${port}`);
}

void bootstrap();
