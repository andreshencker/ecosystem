import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { BusinessIntelligenceModule } from '../integrations/business-intelligence/business-intelligence.module';

@Module({
  imports: [BusinessIntelligenceModule],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
