import { Controller, Get, Query } from '@nestjs/common';
import { SignalService } from './signal.service';

@Controller('signals/mt5')
export class SignalController {
  constructor(private readonly service: SignalService) {}

  @Get('/status')
  statusSignalServer() {
    return { status: 'Running :)' };
  }

  @Get('/latest')
  getLatestSignal(
    @Query('symbol') symbol: string,
    @Query('accountNumber') accountNumber: string,
    @Query('timeFrame') timeFrame: string,
    @Query('latestSignalId') latestSignalId: string,
    @Query('eaVersion') eaVersion: string,
    @Query('eaVersionId') eaVersionId: string,
  ) {
    if (!symbol) {
      return { message: 'Missing symbol' };
    }

    if (!accountNumber) {
      return { message: 'Missing accountNumber' };
    }
    return this.service.getLatestSignal(
      symbol,
      accountNumber,
      timeFrame,
      latestSignalId,
      eaVersion,
      eaVersionId,
    );
  }

  @Get('')
  getAllSignals() {
    console.info('Getting all cached signals');
    return this.service.getAllCachedSignals();
  }
}
