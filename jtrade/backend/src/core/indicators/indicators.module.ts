import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { IndicatorsController } from './indicators.controller';
import { IndicatorsService } from './indicators.service';

import { Indicator, IndicatorSchema } from './schemas/indicator.schema';

import {
  CompanyProvider,
  CompanyProviderSchema,
} from '../company-provider/schemas/company-provider.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Indicator.name,
        schema: IndicatorSchema,
      },
      {
        name: CompanyProvider.name,
        schema: CompanyProviderSchema,
      },
    ]),
  ],
  controllers: [IndicatorsController],
  providers: [IndicatorsService],
  exports: [IndicatorsService, MongooseModule],
})
export class IndicatorsModule {}
