import { Module } from '@nestjs/common';
import { BinanceAccountsModule } from './binance-accounts/binance-accounts.module';
import { BinanceTradesModule } from './trades/binance-trades.module';
import { BinanceOrdersModule } from './orders/binance-orders.module';

@Module({
  imports: [BinanceAccountsModule, BinanceTradesModule, BinanceOrdersModule],
  // No hace falta declarar controllers/providers aquí;
  // se definen en cada módulo de feature.
  exports: [BinanceAccountsModule, BinanceTradesModule, BinanceOrdersModule],
})
export class BinanceModule {}
