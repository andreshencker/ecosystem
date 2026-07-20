import { Module } from '@nestjs/common';
import { PlatformMailService } from './platform-mail.service';

@Module({
  providers: [PlatformMailService],
  exports: [PlatformMailService],
})
export class PlatformMailModule {}
