// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './core/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { TypeProductsModule } from './core/type-products/type-products.module';
import { GrapiflyIntegrationModule } from './integrations/grapifly/grapifly-integration.module';
import { ProductsModule } from './core/products/products.module';
import { ProductPricingModule } from './core/product-pricing/product-pricing.module';
import { OrdersModule } from './core/orders/orders.module';
import { PlatformsModule } from './core/platforms/platforms.module';
import { IndicatorsModule } from './core/indicators/indicators.module';
import { SymbolsModule } from './core/symbols/symbols.module';
import { SignalsModule } from './core/signals/signals.module';
import { SignalbotsModule } from './core/signalbots/signalbots.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    TypeProductsModule,
    PlatformsModule,
    ProductsModule,
    ProductPricingModule,
    OrdersModule,
    IndicatorsModule,
    SymbolsModule,
    SignalsModule,
    SignalbotsModule,
    GrapiflyIntegrationModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
