import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SymbolsService } from './symbols.service';
import { SymbolsController } from './symbols.controller';

import { Symbol, SymbolSchema } from './schemas/symbol.schema';

import {
  CompanyProvider,
  CompanyProviderSchema,
} from '../company-provider/schemas/company-provider.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Symbol.name,
        schema: SymbolSchema,
      },
      {
        name: CompanyProvider.name,
        schema: CompanyProviderSchema,
      },
    ]),
  ],
  controllers: [SymbolsController],
  providers: [SymbolsService],
  exports: [SymbolsService],
})
export class SymbolsModule {}
