import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TypeProductsController } from './type-products.controller';
import { TypeProductsService } from './type-products.service';

import { TypeProduct, TypeProductSchema } from './schemas/type-product.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { RelayIntegrationModule } from '../../integrations/relay/relay-integration.module';

@Module({
  imports: [
    RelayIntegrationModule,
    MongooseModule.forFeature([
      { name: TypeProduct.name, schema: TypeProductSchema },
      // Read-only here — used to block deleting a type that products reference.
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [TypeProductsController],
  providers: [TypeProductsService],
  exports: [TypeProductsService],
})
export class TypeProductsModule {}
