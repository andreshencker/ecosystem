import { Module } from '@nestjs/common';
import { ShiftInvoiceController } from './shift-invoice.controller';
import { ShiftInvoiceService } from './shift-invoice.service';
import { BusinessIntelligenceModule } from '../../../business-intelligence.module';

/**
 * Shift Invoice BI contract module.
 *
 * Does not import BusinessIntelligenceModule yet — the BI call is a placeholder.
 * When the real BI endpoint is available, add BusinessIntelligenceModule to imports
 * and inject BusinessIntelligenceService into ShiftInvoiceService.
 */
@Module({
  imports: [BusinessIntelligenceModule],
  controllers: [ShiftInvoiceController],
  providers: [ShiftInvoiceService],
  exports: [ShiftInvoiceService],
})
export class ShiftInvoiceModule {}
