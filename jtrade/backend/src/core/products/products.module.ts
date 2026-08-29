import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { TypeProduct, TypeProductSchema } from '../type-products/schemas/type-product.schema';
import { PlatformsModule } from '../platforms/platforms.module';
import { RelayIntegrationModule } from '../../integrations/relay/relay-integration.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { ProductVersion, ProductVersionSchema } from './schemas/product-version.schema';

@Module({
  imports: [AuthModule, PlatformsModule, RelayIntegrationModule, MongooseModule.forFeature([
    { name: Product.name, schema: ProductSchema }, { name: ProductVersion.name, schema: ProductVersionSchema },
    { name: TypeProduct.name, schema: TypeProductSchema },
  ])],
  controllers: [ProductsController], providers: [ProductsService], exports: [ProductsService],
})
export class ProductsModule {}
