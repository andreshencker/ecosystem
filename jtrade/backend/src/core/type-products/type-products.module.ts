import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TypeProductsController } from './type-products.controller';
import { TypeProductsService } from './type-products.service';

import { TypeProduct, TypeProductSchema } from './schemas/type-product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TypeProduct.name,
        schema: TypeProductSchema,
      },
    ]),
  ],
  controllers: [TypeProductsController],
  providers: [TypeProductsService],
  exports: [TypeProductsService],
})
export class TypeProductsModule {}
