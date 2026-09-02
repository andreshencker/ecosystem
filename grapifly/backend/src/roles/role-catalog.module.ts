import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleCatalogEntry, RoleCatalogEntrySchema } from './schemas/role-catalog-entry.schema';
import { RoleCatalogService } from './role-catalog.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: RoleCatalogEntry.name, schema: RoleCatalogEntrySchema }])],
  providers: [RoleCatalogService],
  exports: [RoleCatalogService],
})
export class RoleCatalogModule {}
