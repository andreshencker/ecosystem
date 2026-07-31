import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../../../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../../../../infrastructure/security/types/auth-context.types';

import { ShiftInvoiceService } from './shift-invoice.service';
import { SHIFT_INVOICE_FORMATS, type ShiftInvoiceFormat } from './shift-invoice.types';

@ApiTags('BI Contracts — Invoice')
@ApiBearerAuth()
@Controller('integrations/business-intelligence/contracts/invoice/shift-invoice')
export class ShiftInvoiceController {
  constructor(private readonly service: ShiftInvoiceService) {}

  /**
   * Generate the Shift Invoice BI contract in the requested format.
   *
   * businessId is always resolved from the JWT auth context.
   * invoiceId and format are supplied by the caller.
   *
   * GET /integrations/business-intelligence/contracts/invoice/shift-invoice/:format
   *   ?invoiceId=<mongo-id>
   */
  @Get(':format')
  @ApiOperation({ summary: 'Generate the Shift Invoice contract for a specific output format' })
  @ApiParam({
    name: 'format',
    enum: SHIFT_INVOICE_FORMATS,
    description: 'Target document format',
  })
  @ApiQuery({
    name: 'invoiceId',
    required: true,
    description: 'MongoDB ObjectId of the invoice to generate',
  })
  async generate(
    @Param('format') format: string,
    @Query('invoiceId') invoiceId: string,
    @CurrentUser() ctx: AuthContext,
  ) {
    const businessId = this.resolveBusinessId(ctx);
    const resolvedFormat = this.resolveFormat(format);
    if (!invoiceId?.trim()) {
      throw new BadRequestException('invoiceId query parameter is required');
    }
    return this.service.generate(businessId, invoiceId.trim(), resolvedFormat);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private resolveBusinessId(ctx: AuthContext): string {
    if (!ctx.companyId) {
      throw new ForbiddenException('No company assigned to this account');
    }
    return ctx.companyId;
  }

  private resolveFormat(raw: string): ShiftInvoiceFormat {
    const lower = raw?.toLowerCase() as ShiftInvoiceFormat;
    if (!SHIFT_INVOICE_FORMATS.includes(lower)) {
      throw new BadRequestException(
        `Unsupported format "${raw}". Allowed: ${SHIFT_INVOICE_FORMATS.join(', ')}`,
      );
    }
    return lower;
  }
}
