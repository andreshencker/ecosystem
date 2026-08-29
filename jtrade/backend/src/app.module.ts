// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './core/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { TypeProjectsModule } from './core/type-projects/type-projects.module';
import { GrapiflyIntegrationModule } from './integrations/grapifly/grapifly-integration.module';
import { RelayIntegrationModule } from './integrations/relay/relay-integration.module';
import { ProductsModule } from './core/products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    TypeProjectsModule,
    ProductsModule,
    GrapiflyIntegrationModule,
    RelayIntegrationModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
