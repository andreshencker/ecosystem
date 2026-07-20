import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BIHttpClient } from './bi-http-client';

@Module({
  imports: [HttpModule],
  providers: [BIHttpClient],
  exports: [BIHttpClient],
})
export class BiClientModule {}
