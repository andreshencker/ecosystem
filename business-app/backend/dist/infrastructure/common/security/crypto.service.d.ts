import { ConfigService } from '@nestjs/config';
export type EncryptedPayload = {
    alg: 'aes-256-gcm';
    ivBase64: string;
    tagBase64: string;
    dataBase64: string;
};
export declare class CryptoService {
    private readonly config;
    private readonly key;
    constructor(config: ConfigService);
    encryptJson(obj: any): EncryptedPayload;
    decryptJson(payload: EncryptedPayload): any;
    encryptObject(obj: any): EncryptedPayload;
    decryptObject(payload: EncryptedPayload): any;
}
