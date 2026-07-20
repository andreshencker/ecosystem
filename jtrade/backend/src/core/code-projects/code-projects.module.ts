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
  TypeProject,
  TypeProjectSchema,
} from '../type-projects/schemas/type-project.schema';

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
        name: TypeProject.name,
        schema: TypeProjectSchema,
      },
    ]),
  ],
  controllers: [CodeProjectsController],
  providers: [CodeProjectsService],
  exports: [CodeProjectsService],
})
export class CodeProjectsModule {}
