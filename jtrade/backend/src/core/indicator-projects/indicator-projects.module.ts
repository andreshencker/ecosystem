import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { IndicatorProjectsService } from './indicator-projects.service';
import { IndicatorProjectsController } from './indicator-projects.controller';

import {
  IndicatorProject,
  IndicatorProjectSchema,
} from './schemas/indicator-project.schema';

import {
  CompanyProvider,
  CompanyProviderSchema,
} from '../company-provider/schemas/company-provider.schema';

import {
  ProjectCodePlatform,
  ProjectCodePlatformSchema,
} from '../project-code-platform/schemas/project-code-platform.schema';

import {
  Indicator,
  IndicatorSchema,
} from '../indicators/schemas/indicator.schema';

import {
  UserProjectPlatform,
  UserProjectPlatformSchema,
} from '../user-project-platform/schemas/user-project-platform.schema';

import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: IndicatorProject.name,
        schema: IndicatorProjectSchema,
      },
      {
        name: CompanyProvider.name,
        schema: CompanyProviderSchema,
      },
      {
        name: ProjectCodePlatform.name,
        schema: ProjectCodePlatformSchema,
      },
      {
        name: Indicator.name,
        schema: IndicatorSchema,
      },
      {
        name: UserProjectPlatform.name,
        schema: UserProjectPlatformSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [IndicatorProjectsController],
  providers: [IndicatorProjectsService],
  exports: [IndicatorProjectsService],
})
export class IndicatorProjectsModule {}
