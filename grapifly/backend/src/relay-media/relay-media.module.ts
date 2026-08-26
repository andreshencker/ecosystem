import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RelayMediaService } from './relay-media.service';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Organization.name, schema: OrganizationSchema }]),
  ],
  providers: [RelayMediaService],
  exports: [RelayMediaService],
})
export class RelayMediaModule {}
