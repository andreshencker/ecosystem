import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsService } from './applications.service';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { ApplicationsPublicController } from './applications-public.controller';
import { RelayMediaModule } from '../relay-media/relay-media.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }]),
    RelayMediaModule,
  ],
  providers: [ApplicationsService],
  controllers: [ApplicationsPublicController],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
