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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var BIHttpClient_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIHttpClient = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const axios_2 = __importDefault(require("axios"));
const bi_unavailable_error_1 = require("../errors/bi-unavailable.error");
let BIHttpClient = BIHttpClient_1 = class BIHttpClient {
    http;
    config;
    logger = new common_1.Logger(BIHttpClient_1.name);
    constructor(http, config) {
        this.http = http;
        this.config = config;
    }
    get baseUrl() {
        return (this.config.get('BI_SERVICE_URL') ?? 'http://localhost:8000').replace(/\/$/, '');
    }
    get serviceToken() {
        return this.config.get('BI_INTERNAL_SERVICE_TOKEN') ?? '';
    }
    headers() {
        return { 'x-internal-service-token': this.serviceToken };
    }
    classifyError(err, method, path) {
        if (!axios_2.default.isAxiosError(err)) {
            const msg = err instanceof Error ? err.message : 'unknown error';
            this.logger.error(`[BI] ${method} ${path} — non-axios error: ${msg}`);
            return new bi_unavailable_error_1.BIUnavailableError(`BI ${method} ${path} failed: ${msg}`);
        }
        if (!err.response) {
            const code = err.code;
            if (code === 'ECONNREFUSED') {
                this.logger.error(`[BI] ${method} ${path} — connection refused (${this.baseUrl})`);
                return new bi_unavailable_error_1.BIUnavailableError(`BI service refused connection at ${this.baseUrl}`, undefined, 'connection_refused');
            }
            if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || err.message.includes('timeout')) {
                this.logger.error(`[BI] ${method} ${path} — request timed out`);
                return new bi_unavailable_error_1.BIUnavailableError('BI service request timed out', undefined, 'timeout');
            }
            this.logger.error(`[BI] ${method} ${path} — no response (code=${code ?? 'unknown'}): ${err.message}`);
            return new bi_unavailable_error_1.BIUnavailableError(`BI ${method} ${path} failed: ${err.message}`);
        }
        const status = err.response.status;
        const detail = err.response.data?.detail ??
            err.message;
        this.logger.error(`[BI] ${method} ${path} — HTTP ${status}: ${detail}`);
        if (status === 401 || status === 403) {
            return new bi_unavailable_error_1.BIUnavailableError(`BI integration authentication error (HTTP ${status}): ${detail}`, status, 'auth_error');
        }
        if (status === 404) {
            return new bi_unavailable_error_1.BIUnavailableError(`BI endpoint not found: ${method} ${path}`, status, 'not_found');
        }
        if (status === 422) {
            return new bi_unavailable_error_1.BIUnavailableError(`BI rejected query parameters (HTTP 422): ${detail}`, status, 'validation_error');
        }
        if (status >= 500) {
            return new bi_unavailable_error_1.BIUnavailableError(`BI internal processing error (HTTP ${status}): ${detail}`, status, 'bi_internal_error');
        }
        return new bi_unavailable_error_1.BIUnavailableError(`BI ${method} ${path} returned HTTP ${status}: ${detail}`, status);
    }
    async get(path, params = {}, timeoutMs = 10_000) {
        const url = `${this.baseUrl}${path}`;
        const paramSummary = Object.keys(params).length
            ? JSON.stringify(params)
            : '(none)';
        const start = Date.now();
        this.logger.log(`[BI] GET ${path} — base: ${this.baseUrl} | params: ${paramSummary}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.get(url, {
                headers: this.headers(),
                params,
                timeout: timeoutMs,
            }));
            this.logger.log(`[BI] GET ${path} → ${res.status} (${Date.now() - start}ms)`);
            return res.data;
        }
        catch (err) {
            this.logger.error(`[BI] GET ${path} failed after ${Date.now() - start}ms`);
            throw this.classifyError(err, 'GET', path);
        }
    }
    async post(path, body, timeoutMs = 60_000) {
        const url = `${this.baseUrl}${path}`;
        const start = Date.now();
        this.logger.log(`[BI] POST ${path} — base: ${this.baseUrl}`);
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.http.post(url, body, {
                headers: this.headers(),
                timeout: timeoutMs,
            }));
            this.logger.log(`[BI] POST ${path} → ${res.status} (${Date.now() - start}ms)`);
            return res.data;
        }
        catch (err) {
            this.logger.error(`[BI] POST ${path} failed after ${Date.now() - start}ms`);
            throw this.classifyError(err, 'POST', path);
        }
    }
};
exports.BIHttpClient = BIHttpClient;
exports.BIHttpClient = BIHttpClient = BIHttpClient_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], BIHttpClient);
//# sourceMappingURL=bi-http-client.js.map