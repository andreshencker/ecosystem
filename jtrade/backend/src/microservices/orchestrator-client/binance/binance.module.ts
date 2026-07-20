import { Module } from '@nestjs/common';

import { BinanceAccountsController } from './binanceAccount/binance-accounts.controller';
import { BinanceAccountsPlatformClient } from './binanceAccount/binance-accounts.platform-client';

@Module({
  controllers: [BinanceAccountsController],
  providers: [BinanceAccountsPlatformClient],
  exports: [BinanceAccountsPlatformClient],
})
export class BinanceModule {}
