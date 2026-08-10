import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Contract, ContractSchema } from '../contracts/schemas/contract.schema';
import { Shift, ShiftSchema } from '../shifts/schemas/shift.schema';
import { BusinessIntelligenceModule } from '../../integrations/business-intelligence/business-intelligence.module';
import { InvoiceReviewItem, InvoiceReviewItemSchema } from './schemas/invoice-review-item.schema';
import { CommunicationsModule } from '../../integrations/communications/communications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: InvoiceReviewItem.name, schema: InvoiceReviewItemSchema },
    ]),
    BusinessIntelligenceModule,
    CommunicationsModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
