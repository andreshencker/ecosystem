import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RelayClientService } from './relay-client.service';

@Module({
  imports: [HttpModule],
  providers: [RelayClientService],
  exports: [RelayClientService],
})
export class RelayClientModule {}
