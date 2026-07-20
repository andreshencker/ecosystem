import { Module } from '@nestjs/common';
import { BinanceTradesService } from './binance-trades.service';
import { BinanceTradesController } from './binance-trades.controller';
import { BinanceClientFactory } from '../api/binance-client.factory';
import { BinanceAccountsModule } from '../binance-accounts/binance-accounts.module';

@Module({
  imports: [
    // Para poder usar BinanceAccountsService dentro de BinanceClientFactory
    BinanceAccountsModule,
  ],
  controllers: [BinanceTradesController],
  providers: [BinanceClientFactory, BinanceTradesService],
  exports: [BinanceTradesService],
})
export class BinanceTradesModule {}
