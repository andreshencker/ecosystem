import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { PricingOverviewController } from './pricing-overview.controller';
import { ProductPricingController } from './product-pricing.controller';
import { ProductPricingService } from './product-pricing.service';
import { ProductPricing, ProductPricingSchema } from './schemas/product-pricing.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: ProductPricing.name, schema: ProductPricingSchema },
    ]),
  ],
  controllers: [PricingOverviewController, ProductPricingController],
  providers: [ProductPricingService],
  exports: [ProductPricingService],
})
export class ProductPricingModule {}
