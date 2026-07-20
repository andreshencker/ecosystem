import { Injectable } from '@nestjs/common';
import { CoreClient } from '../../../common/clients/core.client';

@Injectable()
export class SignalService {
  private cache: Map<string, string> = new Map();

  constructor(private readonly coreClient: CoreClient) {}

  async getLatestSignal(
    symbol: string,
    accountNumber: string,
    timeFrame: string,
    latestSignalId: string,
    eaVersion: string,
    eaVersionId: string,
  ): Promise<string> {
    const result = await this.coreClient.getSignalInformation({
      symbol,
      accountNumber,
      timeFrame,
      latestSignalId,
      eaVersion,
      eaVersionId,
    });

    console.log('Result : ', result);

    if (!result || result.startsWith('Error') || result === 'No data') {
      return 'No signal';
    }

    return result;
  }

  getAllCachedSignals(): Record<string, any> {
    const keys = this.cache.keys();
    const signals = {};

    for (const key of keys) {
      signals[key] = this.cache.get(key);
    }
    return signals;
  }
}
