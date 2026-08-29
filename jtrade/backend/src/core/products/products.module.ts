import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { TypeProject, TypeProjectSchema } from '../type-projects/schemas/type-project.schema';
import { PlatformsModule } from '../platforms/platforms.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductVersion, ProductVersionSchema } from './schemas/product-version.schema';

@Module({
  imports: [AuthModule, PlatformsModule, MongooseModule.forFeature([
    { name: Product.name, schema: ProductSchema }, { name: ProductVersion.name, schema: ProductVersionSchema },
    { name: TypeProject.name, schema: TypeProjectSchema },
  ])],
  controllers: [ProductsController], providers: [ProductsService], exports: [ProductsService],
})
export class ProductsModule {}
