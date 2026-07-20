import { Module } from '@nestjs/common';
import { BinanceOrdersService } from './binance-orders.service';
import { BinanceOrdersController } from './binance-orders.controller';
import { BinanceClientFactory } from '../api/binance-client.factory';
import { BinanceAccountsModule } from '../binance-accounts/binance-accounts.module';

@Module({
  imports: [
    // Igual que en trades: necesitamos poder leer credenciales desencriptadas
    BinanceAccountsModule,
  ],
  controllers: [BinanceOrdersController],
  providers: [BinanceClientFactory, BinanceOrdersService],
  exports: [BinanceOrdersService],
})
export class BinanceOrdersModule {}
