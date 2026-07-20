"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
let LoggerService = class LoggerService {
    service = 'communication-modules';
    write(level, message, context, meta) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.service,
            context: context ?? 'App',
            message,
            ...(meta ?? {}),
        };
        const line = JSON.stringify(entry);
        if (level === 'error') {
            process.stderr.write(line + '\n');
        }
        else {
            process.stdout.write(line + '\n');
        }
    }
    log(message, context, meta) {
        this.write('log', message, context, meta);
    }
    error(message, context, meta) {
        this.write('error', message, context, meta);
    }
    warn(message, context, meta) {
        this.write('warn', message, context, meta);
    }
    debug(message, context, meta) {
        this.write('debug', message, context, meta);
    }
    verbose(message, context, meta) {
        this.write('verbose', message, context, meta);
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.DEFAULT })
], LoggerService);
//# sourceMappingURL=logger.service.js.map