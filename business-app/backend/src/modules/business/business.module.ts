import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import {
  BusinessSmtp,
  BusinessSmtpSchema,
} from './schemas/business-smtp.schema';
import { Business, BusinessSchema } from './schemas/business.schema';
import { SecurityModule } from '../../infrastructure/common/security/security.module';
import { RolesGuard } from '../../infrastructure/security/guards/roles.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Business.name, schema: BusinessSchema },
      { name: BusinessSmtp.name, schema: BusinessSmtpSchema },
    ]),
    SecurityModule,
    UsersModule,
  ],
  controllers: [BusinessController],
  providers: [BusinessService, RolesGuard],
  exports: [BusinessService],
})
export class BusinessModule {}
