import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SignalsModule } from '../signals/signals.module';
import { IndicatorWebhookController } from './indicator-webhook.controller';
import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';
import { Indicator, IndicatorSchema } from './schemas/indicator.schema';
import { Symbol, SymbolSchema } from '../symbols/schemas/symbol.schema';

@Module({
  imports: [
    AuthModule,
    SignalsModule,
    MongooseModule.forFeature([
      { name: Indicator.name, schema: IndicatorSchema },
      { name: Symbol.name, schema: SymbolSchema },
    ]),
  ],
  controllers: [IndicatorsController, IndicatorWebhookController],
  providers: [IndicatorsService],
  exports: [IndicatorsService],
})
export class IndicatorsModule {}
