import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

import { Alert, AlertSchema } from './schemas/alert.schema';

import {
  IndicatorProject,
  IndicatorProjectSchema,
} from '../indicator-projects/schemas/indicator-project.schema';

import { Symbol, SymbolSchema } from '../symbols/schemas/symbol.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Alert.name,
        schema: AlertSchema,
      },
      {
        name: IndicatorProject.name,
        schema: IndicatorProjectSchema,
      },
      {
        name: Symbol.name,
        schema: SymbolSchema,
      },
    ]),
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
