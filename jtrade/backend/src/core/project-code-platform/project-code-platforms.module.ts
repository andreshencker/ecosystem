import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ProjectCodePlatformsController } from './project-code-platforms.controller';
import { ProjectCodePlatformsService } from './project-code-platforms.service';

import {
  ProjectCodePlatform,
  ProjectCodePlatformSchema,
} from './schemas/project-code-platform.schema';

import {
  CodeProject,
  CodeProjectSchema,
} from '../code-projects/schemas/code-project.schema';

import {
  CompanyProvider,
  CompanyProviderSchema,
} from '../company-provider/schemas/company-provider.schema';

import { Platform, PlatformSchema } from '../platforms/schemas/platform.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
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
  controllers: [ProjectCodePlatformsController],
  providers: [ProjectCodePlatformsService],
  exports: [ProjectCodePlatformsService],
})
export class ProjectCodePlatformsModule {}
