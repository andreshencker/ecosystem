import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RelayStorageService } from './relay-storage.service';

@Module({
  imports: [HttpModule],
  providers: [RelayStorageService],
  exports: [HttpModule, RelayStorageService],
})
export class RelayIntegrationModule {}
