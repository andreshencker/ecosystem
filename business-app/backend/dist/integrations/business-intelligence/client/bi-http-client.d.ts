import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class BIHttpClient {
    private readonly http;
    private readonly config;
    private readonly logger;
    constructor(http: HttpService, config: ConfigService);
    get baseUrl(): string;
    private get serviceToken();
    private headers;
    private classifyError;
    get<T>(path: string, params?: Record<string, string>, timeoutMs?: number): Promise<T>;
    post<TReq, TRes>(path: string, body: TReq, timeoutMs?: number): Promise<TRes>;
}
