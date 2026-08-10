import { Module } from '@nestjs/common';

import { NotificationsClient } from './notifications/notifications-client';

@Module({
  providers: [NotificationsClient],
  exports: [NotificationsClient],
})
export class CommunicationsClientModule {}
