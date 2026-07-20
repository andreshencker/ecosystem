import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { CompanyProvidersController } from './company-providers.controller';

import { CompanyProvidersService } from './company-providers.service';

import {
  CompanyProvider,
  CompanyProviderSchema,
} from './schemas/company-provider.schema';

import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: CompanyProvider.name,
        schema: CompanyProviderSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  controllers: [CompanyProvidersController],

  providers: [CompanyProvidersService],

  exports: [CompanyProvidersService],
})
export class CompanyProvidersModule {}
