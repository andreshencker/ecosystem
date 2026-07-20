import { Module } from '@nestjs/common';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { BiClientModule } from './client/bi-client.module';

@Module({
  imports: [BiClientModule],
  providers: [BusinessIntelligenceService],
  exports: [BusinessIntelligenceService],
})
export class BusinessIntelligenceModule {}
