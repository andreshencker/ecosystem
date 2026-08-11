import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GrapiflyUser, GrapiflyUserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: GrapiflyUser.name, schema: GrapiflyUserSchema }])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
