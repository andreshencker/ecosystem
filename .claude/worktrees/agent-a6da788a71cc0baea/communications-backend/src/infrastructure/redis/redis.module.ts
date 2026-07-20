import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const redisProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis => {
    const host = config.get<string>('REDIS_HOST', 'localhost');
    const port = config.get<number>('REDIS_PORT', 6379);
    const password = config.get<string>('REDIS_PASSWORD') || undefined;

    const client = new Redis({ host, port, password, lazyConnect: false });

    client.on('connect', () =>
      console.log(`Redis connected at ${host}:${port}`),
    );
    client.on('error', (err) =>
      console.error('Redis client error:', err.message),
    );

    return client;
  },
};

@Global()
@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule {}
