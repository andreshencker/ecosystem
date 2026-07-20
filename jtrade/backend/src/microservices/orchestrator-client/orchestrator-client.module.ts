import { Module } from '@nestjs/common';
import { BinanceModule } from './binance/binance.module';
import { SignalsModule } from '../../core/signals/signal.module';

@Module({
  imports: [BinanceModule, SignalsModule],
})
export class OrchestratorClientModule {}
