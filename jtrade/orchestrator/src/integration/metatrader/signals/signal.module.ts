import { Module } from '@nestjs/common';
import { SignalController } from './signal.controller';
import { SignalService } from './signal.service';
import { CoreClient } from '../../../common/clients/core.client';

@Module({
  controllers: [SignalController],
  providers: [SignalService, CoreClient],
})
export class SignalModule {}
