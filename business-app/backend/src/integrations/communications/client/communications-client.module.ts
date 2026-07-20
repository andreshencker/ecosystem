import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CommunicationsClientService } from './communications-client.service';

@Module({
  imports: [HttpModule],
  providers: [CommunicationsClientService],
  exports: [CommunicationsClientService],
})
export class CommunicationsClientModule {}
