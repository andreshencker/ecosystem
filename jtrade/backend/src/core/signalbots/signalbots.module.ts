import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SignalsModule } from '../signals/signals.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { ProductVersion, ProductVersionSchema } from '../products/schemas/product-version.schema';
import { Symbol, SymbolSchema } from '../symbols/schemas/symbol.schema';
import { Indicator, IndicatorSchema } from '../indicators/schemas/indicator.schema';
import { Signalbot, SignalbotSchema } from './schemas/signalbot.schema';
import { SignalResult, SignalResultSchema } from './schemas/signal-result.schema';
import { SignalbotsService } from './signalbots.service';
import { SignalbotsController } from './signalbots.controller';
import { RuntimeController } from './runtime.controller';

@Module({
  imports: [
    AuthModule,
    SignalsModule,
    MongooseModule.forFeature([
      { name: Signalbot.name, schema: SignalbotSchema },
      { name: SignalResult.name, schema: SignalResultSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductVersion.name, schema: ProductVersionSchema },
      { name: Symbol.name, schema: SymbolSchema },
      { name: Indicator.name, schema: IndicatorSchema },
    ]),
  ],
  controllers: [SignalbotsController, RuntimeController],
  providers: [SignalbotsService],
  exports: [SignalbotsService],
})
export class SignalbotsModule {}
