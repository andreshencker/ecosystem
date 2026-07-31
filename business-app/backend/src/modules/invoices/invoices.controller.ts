import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { InvoicesService } from './invoices.service';
import { ApproveInvoiceDto } from './dto/approve-invoice.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  private resolveContext(ctx: AuthContext) {
    if (!ctx.companyId) throw new ForbiddenException('No business assigned');
    return ctx.companyId;
  }

  @Post('approve')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Approve a pending invoice group',
    description:
      'Re-fetches the BI calculation, validates the group is approvable, ' +
      'persists the Invoice, marks the covered Shifts as invoiced, and ' +
      'returns the invoice number. Idempotent: returns 409 if already approved.',
  })
  async approve(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: ApproveInvoiceDto,
  ) {
    const businessId = this.resolveContext(ctx);
    return this.invoicesService.approve(businessId, dto);
  }
}
