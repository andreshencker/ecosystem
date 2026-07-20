"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
let CryptoService = class CryptoService {
    config;
    key;
    constructor(config) {
        this.config = config;
        const b64 = this.config.get('CREDENTIALS_MASTER_KEY_BASE64') ??
            process.env.CREDENTIALS_MASTER_KEY_BASE64 ??
            '';
        if (!b64)
            throw new Error('CREDENTIALS_MASTER_KEY_BASE64 is required');
        const key = Buffer.from(b64, 'base64');
        if (key.length !== 32) {
            throw new Error('CREDENTIALS_MASTER_KEY_BASE64 must decode to 32 bytes (AES-256 key)');
        }
        this.key = key;
    }
    encryptJson(obj) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
        const plaintext = Buffer.from(JSON.stringify(obj ?? {}), 'utf8');
        const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const tag = cipher.getAuthTag();
        return {
            alg: 'aes-256-gcm',
            ivBase64: iv.toString('base64'),
            tagBase64: tag.toString('base64'),
            dataBase64: encrypted.toString('base64'),
        };
    }
    decryptJson(payload) {
        if (!payload?.ivBase64 || !payload?.tagBase64 || !payload?.dataBase64) {
            throw new Error('Invalid encrypted payload');
        }
        const iv = Buffer.from(payload.ivBase64, 'base64');
        const tag = Buffer.from(payload.tagBase64, 'base64');
        const data = Buffer.from(payload.dataBase64, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return JSON.parse(decrypted.toString('utf8'));
    }
    encryptObject(obj) {
        return this.encryptJson(obj);
    }
    decryptObject(payload) {
        return this.decryptJson(payload);
    }
};
exports.CryptoService = CryptoService;
exports.CryptoService = CryptoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CryptoService);
//# sourceMappingURL=crypto.service.js.map