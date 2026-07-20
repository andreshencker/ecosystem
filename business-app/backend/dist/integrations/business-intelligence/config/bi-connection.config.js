"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBiConnectionConfig = resolveBiConnectionConfig;
function resolveBiConnectionConfig() {
    return {
        baseUrl: (process.env['BI_SERVICE_URL'] ?? 'http://localhost:8000').replace(/\/$/, ''),
        serviceToken: process.env['BI_INTERNAL_SERVICE_TOKEN'] ?? '',
    };
}
//# sourceMappingURL=bi-connection.config.js.map