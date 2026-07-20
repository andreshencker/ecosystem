// src/modules/signals/signals.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SignalsController } from './signals.controller';
import { SignalsService } from './services/signals.service';

import { Signal, SignalSchema } from './schemas/signal.schema';
import { Alert, AlertSchema } from '../alerts/schemas/alert.schema'; // 👈 importar el schemas
import { AdminIndicatorsModule } from '../admin-indicators/admin-indicators.module';
import { SymbolExecutionsModule } from '../symbol-executions/symbol-executions.module';
import { SymbolsModule } from '../symbols/symbols.module';
import { Symbol, SymbolSchema } from '../symbols/schemas/symbol.schema';
import { ConfigModule } from '@nestjs/config';
import {
  CodeProjectVersion,
  CodeProjectVersionSchema,
} from '../code-project-versions/schemas/code-project-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Signal.name, schema: SignalSchema },
      { name: Alert.name, schema: AlertSchema },
      { name: Symbol.name, schema: SymbolSchema },
      { name: CodeProjectVersion.name, schema: CodeProjectVersionSchema },
    ]),
    AdminIndicatorsModule,
    SymbolExecutionsModule,
    SymbolsModule,
    ConfigModule,
  ],
  controllers: [SignalsController],
  providers: [SignalsService],
  exports: [SignalsService],
})
export class SignalsModule {}
