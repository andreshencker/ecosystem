import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongoDatabaseModule } from './database/mongoDatabase.module';
import { SignalModule } from './integration/metatrader/signals/signal.module';
import { BinanceModule } from './integration/binance/binance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongoDatabaseModule,
    SignalModule,
    BinanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
