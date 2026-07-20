import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  CompanyTheme,
  CompanyThemeSchema,
} from './schemas/company-theme.schema';
import { CompanyThemeService } from './company-theme.service';
import { CompanyThemeController } from './company-theme.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: CompanyTheme.name, schema: CompanyThemeSchema },
    ]),
  ],
  controllers: [CompanyThemeController],
  providers: [CompanyThemeService],
  exports: [CompanyThemeService],
})
export class CompanyThemeModule {}
