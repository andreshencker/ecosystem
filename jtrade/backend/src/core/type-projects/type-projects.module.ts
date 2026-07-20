import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TypeProjectsController } from './type-projects.controller';
import { TypeProjectsService } from './type-projects.service';

import { TypeProject, TypeProjectSchema } from './schemas/type-project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TypeProject.name,
        schema: TypeProjectSchema,
      },
    ]),
  ],
  controllers: [TypeProjectsController],
  providers: [TypeProjectsService],
  exports: [TypeProjectsService],
})
export class TypeProjectsModule {}
