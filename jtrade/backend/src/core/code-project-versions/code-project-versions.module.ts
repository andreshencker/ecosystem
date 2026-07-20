import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  CodeProjectVersion,
  CodeProjectVersionSchema,
} from './schemas/code-project-version.schema';

import {
  ProjectCodePlatform,
  ProjectCodePlatformSchema,
} from '../project-code-platform/schemas/project-code-platform.schema';

import {
  CodeProject,
  CodeProjectSchema,
} from '../code-projects/schemas/code-project.schema';

import {
  CompanyProvider,
  CompanyProviderSchema,
} from '../company-provider/schemas/company-provider.schema';

import { Platform, PlatformSchema } from '../platforms/schemas/platform.schema';

import { CodeProjectVersionsController } from './code-project-versions.controller';
import { CodeProjectVersionsService } from './code-project-versions.service';

import { StorageCommunicationsClient } from '../../microservices/communications-client/storage/storage-client';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: CodeProjectVersion.name,
        schema: CodeProjectVersionSchema,
      },
      {
        name: ProjectCodePlatform.name,
        schema: ProjectCodePlatformSchema,
      },
      {
        name: CodeProject.name,
        schema: CodeProjectSchema,
      },
      {
        name: CompanyProvider.name,
        schema: CompanyProviderSchema,
      },
      {
        name: Platform.name,
        schema: PlatformSchema,
      },
    ]),
  ],
  controllers: [CodeProjectVersionsController],
  providers: [CodeProjectVersionsService, StorageCommunicationsClient],
  exports: [CodeProjectVersionsService],
})
export class CodeProjectVersionsModule {}
