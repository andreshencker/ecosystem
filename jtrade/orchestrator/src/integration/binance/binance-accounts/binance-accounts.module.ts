// src/integrations/binance/accounts/binance-accounts.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BinanceAccount,
  BinanceAccountSchema,
} from './schemas/binance-account.schema';
import { BinanceAccountsService } from './binance-accounts.service';
import { BinanceAccountsController } from './binance-accounts.controller';
import { SecurityModule } from '../../../common/security/security.module';

@Module({
  imports: [
    SecurityModule,
    MongooseModule.forFeature([
      { name: BinanceAccount.name, schema: BinanceAccountSchema },
    ]),
  ],
  controllers: [BinanceAccountsController],
  providers: [BinanceAccountsService],
  exports: [BinanceAccountsService], // para que otros módulos (como BinanceModule) lo usen
})
export class BinanceAccountsModule {}
