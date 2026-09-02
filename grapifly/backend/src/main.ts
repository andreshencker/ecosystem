import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // FRONTEND_URL accepts one origin or a comma-separated list (dev keeps a
  // single localhost value; prod can allow grapifly.com + app subdomains).
  const origins = (config.get<string>('FRONTEND_URL') ?? 'http://localhost:3100')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Sits behind a reverse proxy in prod — trust X-Forwarded-* so OAuth/SSO
  // redirects are built with https and the real host.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(cookieParser());
  app.enableCors({ origin: origins.length === 1 ? origins[0] : origins, credentials: true });
  const port = config.get<number>('PORT') ?? 3101;
  await app.listen(port);
  console.log(`Grapifly ID running on port ${port}`);
}

void bootstrap();
