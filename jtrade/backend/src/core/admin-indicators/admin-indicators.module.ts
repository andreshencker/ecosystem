import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminIndicatorsController } from './admin-indicators.controller';
import { AdminIndicatorsService } from './admin-indicators.service';

import {
  AdminIndicator,
  AdminIndicatorSchema,
} from './schemas/admin-indicator.schema';

import {
  IndicatorProject,
  IndicatorProjectSchema,
} from '../indicator-projects/schemas/indicator-project.schema';

import { User, UserSchema } from '../users/schemas/user.schema';

import { WebhookCryptoService } from '../../common/crypto/webhook-crypto.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminIndicator.name, schema: AdminIndicatorSchema },
      { name: IndicatorProject.name, schema: IndicatorProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AdminIndicatorsController],
  providers: [AdminIndicatorsService, WebhookCryptoService],
  exports: [AdminIndicatorsService],
})
export class AdminIndicatorsModule {}
