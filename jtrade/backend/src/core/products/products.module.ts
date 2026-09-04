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
import { ProductPricing, ProductPricingSchema } from '../product-pricing/schemas/product-pricing.schema';
import { Indicator, IndicatorSchema } from '../indicators/schemas/indicator.schema';

@Module({
  imports: [AuthModule, PlatformsModule, RelayIntegrationModule, MongooseModule.forFeature([
    { name: Product.name, schema: ProductSchema }, { name: ProductVersion.name, schema: ProductVersionSchema },
    // Read/write here only to cascade-delete a non-published product's pricing options.
    { name: ProductPricing.name, schema: ProductPricingSchema },
    { name: TypeProduct.name, schema: TypeProductSchema },
    { name: Indicator.name, schema: IndicatorSchema },
  ])],
  controllers: [ProductsController], providers: [ProductsService], exports: [ProductsService],
})
export class ProductsModule {}
