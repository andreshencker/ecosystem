// src/company-info/company.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Company, CompanySchema } from './schemas/company.schema';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';

import { MediaModule } from '../../files/media/media.module'; // ✅

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
    MediaModule, // ✅ CLAVE
  ],
  controllers: [CompanyController],
  providers: [CompanyService],
})
export class CompanyModule {}
