import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MdmService } from './mdm.service';

@ApiTags('MDM')
@ApiBearerAuth()
@Controller('mdm')
export class MdmController {
  constructor(private readonly mdm: MdmService) {}

  @Get('currencies')
  @HttpCode(200)
  @ApiOperation({ summary: 'List supported currency codes' })
  getCurrencies() {
    return { items: this.mdm.getCurrencies() };
  }

  @Get('tax-rates')
  @HttpCode(200)
  @ApiOperation({
    summary: 'List tax rates, optionally filtered by jurisdiction (e.g. AU)',
  })
  @ApiQuery({ name: 'jurisdiction', required: false })
  getTaxRates(@Query('jurisdiction') jurisdiction?: string) {
    return { items: this.mdm.getTaxRates(jurisdiction) };
  }

  @Get('invoice-statuses')
  @HttpCode(200)
  @ApiOperation({ summary: 'List valid Invoice status codes' })
  getInvoiceStatuses() {
    return { items: this.mdm.getInvoiceStatuses() };
  }

  @Get('payment-methods')
  @HttpCode(200)
  @ApiOperation({ summary: 'List supported payment methods' })
  getPaymentMethods() {
    return { items: this.mdm.getPaymentMethods() };
  }

  @Get('billing-cycles')
  @HttpCode(200)
  @ApiOperation({ summary: 'List supported billing cycle types' })
  getBillingCycles() {
    return { items: this.mdm.getBillingCycles() };
  }
}
