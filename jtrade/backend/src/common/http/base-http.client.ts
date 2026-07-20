// src/common/http/base-http.client.ts
import axios from 'axios';

export type HttpResult<T> = {
  ok: boolean;
  status: number;
  message: string | null;
  data: T | null;
};

type BaseHttpClientOptions = {
  baseURL: string;
  timeoutMs?: number;
};

export abstract class BaseHttpClient {
  protected readonly http: ReturnType<typeof axios.create>;

  constructor(opts: BaseHttpClientOptions) {
    if (!opts?.baseURL) throw new Error('Missing baseURL');

    this.http = axios.create({
      baseURL: opts.baseURL,
      timeout: opts.timeoutMs ?? 10_000,
      validateStatus: () => true,
    });
  }

  protected normalize<T>(res: any): HttpResult<T> {
    const data: any = res?.data;
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      message: data?.message ?? data?.error ?? null,
      data: (data ?? null) as T | null,
    };
  }

  protected async request<T>(config: any): Promise<HttpResult<T>> {
    const res = await this.http.request(config);
    return this.normalize<T>(res);
  }
}
