import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { ProductPricingModule } from '../product-pricing/product-pricing.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { ProductOnboardingController } from './product-onboarding.controller';
import { ProductOnboardingService } from './product-onboarding.service';

@Module({
  imports: [
    AuthModule,
    ProductPricingModule,
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [ProductOnboardingController],
  providers: [ProductOnboardingService],
})
export class ProductOnboardingModule {}
