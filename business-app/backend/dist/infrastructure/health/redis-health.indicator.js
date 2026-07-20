"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisHealthIndicator = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const redis_constants_1 = require("../redis/redis.constants");
let RedisHealthIndicator = class RedisHealthIndicator extends terminus_1.HealthIndicator {
    redis;
    constructor(redis) {
        super();
        this.redis = redis;
    }
    async isHealthy(key) {
        try {
            const pong = await this.redis.ping();
            const isUp = pong === 'PONG';
            const result = this.getStatus(key, isUp);
            if (!isUp) {
                throw new terminus_1.HealthCheckError('Redis ping did not return PONG', result);
            }
            return result;
        }
        catch (err) {
            const result = this.getStatus(key, false, { message: err?.message });
            throw new terminus_1.HealthCheckError('Redis health check failed', result);
        }
    }
};
exports.RedisHealthIndicator = RedisHealthIndicator;
exports.RedisHealthIndicator = RedisHealthIndicator = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(redis_constants_1.REDIS_CLIENT)),
    __metadata("design:paramtypes", [Function])
], RedisHealthIndicator);
//# sourceMappingURL=redis-health.indicator.js.map