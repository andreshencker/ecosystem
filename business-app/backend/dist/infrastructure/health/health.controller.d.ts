import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis-health.indicator';
export declare class HealthController {
    private readonly health;
    private readonly mongoose;
    private readonly redisHealth;
    constructor(health: HealthCheckService, mongoose: MongooseHealthIndicator, redisHealth: RedisHealthIndicator);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & import("@nestjs/terminus").HealthIndicatorResult & import("@nestjs/terminus").HealthIndicatorResult<"mongodb">, Partial<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & import("@nestjs/terminus").HealthIndicatorResult & import("@nestjs/terminus").HealthIndicatorResult<"mongodb">> | undefined, Partial<import("@nestjs/terminus").HealthIndicatorResult<string, import("@nestjs/terminus").HealthIndicatorStatus, Record<string, any>> & import("@nestjs/terminus").HealthIndicatorResult & import("@nestjs/terminus").HealthIndicatorResult<"mongodb">> | undefined>>;
}
