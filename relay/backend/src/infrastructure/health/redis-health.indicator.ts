import { Inject, Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      const isUp = pong === 'PONG';
      const result = this.getStatus(key, isUp);

      if (!isUp) {
        throw new HealthCheckError('Redis ping did not return PONG', result);
      }

      return result;
    } catch (err: any) {
      const result = this.getStatus(key, false, { message: err?.message });
      throw new HealthCheckError('Redis health check failed', result);
    }
  }
}
