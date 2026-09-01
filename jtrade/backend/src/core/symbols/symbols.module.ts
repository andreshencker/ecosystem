import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SymbolsController } from './symbols.controller';
import { SymbolsService } from './symbols.service';
import { Symbol, SymbolSchema } from './schemas/symbol.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Symbol.name, schema: SymbolSchema }]),
  ],
  controllers: [SymbolsController],
  providers: [SymbolsService],
  exports: [SymbolsService],
})
export class SymbolsModule {}
