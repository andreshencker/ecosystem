import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Business, BusinessSchema } from '../business/schemas/business.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersBootstrapService } from './users-bootstrap.service';
import { CommunicationsModule } from '../../integrations/communications/communications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Business.name, schema: BusinessSchema },
    ]),
    CommunicationsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersBootstrapService],
  exports: [UsersService],
})
export class UsersModule {}
