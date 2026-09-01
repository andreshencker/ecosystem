import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Signal, SignalSchema } from './schemas/signal.schema';
import { SignalsService } from './signals.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Signal.name, schema: SignalSchema }])],
  providers: [SignalsService],
  exports: [SignalsService, MongooseModule],
})
export class SignalsModule {}
