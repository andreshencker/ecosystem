import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { InvoicesService } from './invoices.service';
import { ApproveInvoiceDto } from './dto/approve-invoice.dto';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { CreateInvoiceReviewItemDto } from './dto/create-invoice-review-item.dto';
import { MarkInvoicePaidDto } from './dto/mark-invoice-paid.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { MarkInvoiceSentDto } from './dto/mark-invoice-sent.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  private resolveContext(ctx: AuthContext) {
    if (!ctx.companyId) throw new ForbiddenException('No business assigned');
    return ctx.companyId;
  }

  @Get()
  @ApiOperation({ summary: 'List approved invoices for the authenticated business' })
  async listApproved(@CurrentUser() ctx: AuthContext) {
    return this.invoicesService.listApproved(this.resolveContext(ctx));
  }

  @Get(':invoiceId/preview.pdf')
  async previewPdf(
    @CurrentUser() ctx: AuthContext,
    @Param('invoiceId') invoiceId: string,
    @Res() response: Response,
  ) {
    const file = await this.invoicesService.previewPdf(
      this.resolveContext(ctx),
      invoiceId,
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    response.setHeader('Cache-Control', 'no-store');
    return response.send(file.buffer);
  }

  @Post('review-items')
  @HttpCode(201)
  async addReviewItem(@CurrentUser() ctx: AuthContext, @Body() dto: CreateInvoiceReviewItemDto) {
    return this.invoicesService.addReviewItem(this.resolveContext(ctx), dto);
  }

  @Delete('review-items/:itemId')
  @HttpCode(204)
  async removeReviewItem(@CurrentUser() ctx: AuthContext, @Param('itemId') itemId: string) {
    await this.invoicesService.removeReviewItem(this.resolveContext(ctx), itemId);
  }

  @Patch(':invoiceId/mark-paid')
  async markPaid(
    @CurrentUser() ctx: AuthContext,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: MarkInvoicePaidDto,
  ) {
    return this.invoicesService.markPaid(this.resolveContext(ctx), invoiceId, dto);
  }

  @Patch(':invoiceId/mark-sent')
  async markSent(
    @CurrentUser() ctx: AuthContext,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: MarkInvoiceSentDto,
  ) {
    return this.invoicesService.markSent(this.resolveContext(ctx), invoiceId, dto);
  }

  @Post(':invoiceId/reminders')
  async recordReminder(
    @CurrentUser() ctx: AuthContext,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.invoicesService.recordReminder(this.resolveContext(ctx), invoiceId);
  }

  @Patch(':invoiceId/void')
  async voidInvoice(
    @CurrentUser() ctx: AuthContext,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: VoidInvoiceDto,
  ) {
    return this.invoicesService.voidInvoice(this.resolveContext(ctx), invoiceId, dto);
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
