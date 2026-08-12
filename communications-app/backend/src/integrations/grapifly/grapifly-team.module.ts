import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from '../../users/users.module';
import { GrapiflyTeamController } from './grapifly-team.controller';
import { GrapiflyTeamService } from './grapifly-team.service';

@Module({
  imports: [HttpModule, UsersModule],
  controllers: [GrapiflyTeamController],
  providers: [GrapiflyTeamService],
})
export class GrapiflyTeamModule {}
