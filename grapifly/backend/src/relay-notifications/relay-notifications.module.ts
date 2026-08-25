import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RelayNotificationService } from './relay-notification.service';

@Module({
  imports: [HttpModule],
  providers: [RelayNotificationService],
  exports: [RelayNotificationService],
})
export class RelayNotificationsModule {}
