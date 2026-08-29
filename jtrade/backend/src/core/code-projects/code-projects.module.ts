import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CodeProjectsController } from './code-projects.controller';
import { CodeProjectsService } from './code-projects.service';

import { CodeProject, CodeProjectSchema } from './schemas/code-project.schema';

import {
  CompanyProvider,
  CompanyProviderSchema,
} from '../company-provider/schemas/company-provider.schema';

import {
  TypeProduct,
  TypeProductSchema,
} from '../type-products/schemas/type-product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: CodeProject.name,
        schema: CodeProjectSchema,
      },
      {
        name: CompanyProvider.name,
        schema: CompanyProviderSchema,
      },
      {
        name: TypeProduct.name,
        schema: TypeProductSchema,
      },
    ]),
  ],
  controllers: [CodeProjectsController],
  providers: [CodeProjectsService],
  exports: [CodeProjectsService],
})
export class CodeProjectsModule {}
