import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsService } from './applications.service';
import { Application, ApplicationSchema } from './schemas/application.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }])],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
