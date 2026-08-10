import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  NOTIFICATION_QUEUE,
  FILE_GENERATION_QUEUE,
  AUDIT_QUEUE,
} from './queues.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6380),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    BullModule.registerQueue(
      { name: NOTIFICATION_QUEUE },
      { name: FILE_GENERATION_QUEUE },
      { name: AUDIT_QUEUE },
    ),
  ],
  // Re-export BullModule so any module that imports QueueModule can
  // inject queues via @InjectQueue(QUEUE_NAME) without extra imports.
  exports: [BullModule],
})
export class QueueModule {}
