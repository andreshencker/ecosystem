import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { BiShiftAssignmentListParams } from '../integrations/business-intelligence/dto/responses/shift-assignment.dto';

import { BusinessIntelligenceService as BiClientService } from '../integrations/business-intelligence/business-intelligence.service';
import { BIUnavailableError } from '../integrations/business-intelligence/errors/bi-unavailable.error';
import { CurrentUser } from '../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../infrastructure/security/types/auth-context.types';

/**
 * Gateway between the Frontend and the Business Intelligence service.
 *
 * Authentication: standard JWT via GlobalAuthGuard (inherited from AppModule).
 * businessId: always resolved from AuthContext — never from the request body or query.
 * The Frontend never calls BI directly.
 */
@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly bi: BiClientService) {}

  private resolveCompanyId(ctx: AuthContext): string {
    if (!ctx.companyId)
      throw new ForbiddenException('No company assigned to this account');
    return ctx.companyId;
  }

  @Get('customers/summary')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Customer analytics summary (proxied from BI service)',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'YYYY-MM period filter',
  })
  async getCustomerSummary(
    @CurrentUser() ctx: AuthContext,
    @Query('period') period?: string,
  ) {
    const businessId = this.resolveCompanyId(ctx);
    const result = await this.bi.getCustomerSummary(businessId, period);
    if (!result) {
      throw new ServiceUnavailableException(
        'Business Intelligence service is unavailable',
      );
    }
    return result;
  }

  @Get('dashboard/summary')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Dashboard analytics summary (proxied from BI service)',
  })
  @ApiQuery({ name: 'period', required: false })
  async getDashboardSummary(
    @CurrentUser() ctx: AuthContext,
    @Query('period') period?: string,
  ) {
    const businessId = this.resolveCompanyId(ctx);
    const result = await this.bi.getDashboardSummary(businessId, period);
    if (!result) {
      throw new ServiceUnavailableException(
        'Business Intelligence service is unavailable',
      );
    }
    return result;
  }

  @Get('shifts/assignment/summary')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Shift pending-assignment summary (proxied from BI service)',
    description:
      'Returns aggregate counts for imported Shifts that require Contract assignment. ' +
      'All values come from BI — no pending rule is evaluated in NestJS.',
  })
  async getShiftAssignmentSummary(@CurrentUser() ctx: AuthContext) {
    const businessId = this.resolveCompanyId(ctx);
    try {
      return await this.bi.getShiftAssignmentSummary({ businessId });
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        throw new ServiceUnavailableException(
          'Business Intelligence service is unavailable',
        );
      }
      throw err;
    }
  }

  @Get('invoices/pending-groups')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Pending invoice groups — real-time BI calculation (proxied from BI service)',
    description:
      'Returns confirmed shifts with invoiceStatus=pending grouped by ' +
      'customer × contract × billing period. All amounts are computed by BI. ' +
      'businessId is resolved from the JWT — never from the request.',
  })
  async getPendingInvoiceGroups(@CurrentUser() ctx: AuthContext) {
    const businessId = this.resolveCompanyId(ctx);
    try {
      const result = await this.bi.getPendingInvoiceGroups(businessId);
      if (!result) {
        throw new ServiceUnavailableException(
          'Business Intelligence service is unavailable',
        );
      }
      return result;
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        throw new ServiceUnavailableException(
          'Business Intelligence service is unavailable',
        );
      }
      throw err;
    }
  }

  @Get('invoices/receivables-summary')
  @HttpCode(200)
  async getReceivablesSummary(
    @CurrentUser() ctx: AuthContext,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('customerId') customerId?: string,
    @Query('invoiceStatus') invoiceStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.bi.getReceivablesSummary(this.resolveCompanyId(ctx), {
      dateFrom, dateTo, customerId, invoiceStatus, search,
    });
  }

  @Get('invoices/cash-flow')
  @HttpCode(200)
  async getInvoiceCashFlow(
    @CurrentUser() ctx: AuthContext,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.bi.getInvoiceCashFlow(this.resolveCompanyId(ctx), { dateFrom, dateTo, customerId });
  }

  @Get('shifts/assignment/pending')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Paginated list of imported Shifts pending Contract assignment (proxied from BI)',
    description:
      'Returns BI-sourced imported Shifts that satisfy the pending-assignment rule. ' +
      'businessId is always resolved from the authenticated JWT — never from the request.',
  })
  @ApiQuery({ name: 'page',             required: false, type: Number })
  @ApiQuery({ name: 'limit',            required: false, type: Number })
  @ApiQuery({ name: 'linkedCalendarId', required: false })
  @ApiQuery({ name: 'dateFrom',         required: false, description: 'ISO date YYYY-MM-DD' })
  @ApiQuery({ name: 'dateTo',           required: false, description: 'ISO date YYYY-MM-DD' })
  @ApiQuery({ name: 'search',           required: false })
  async getShiftPendingList(
    @CurrentUser() ctx: AuthContext,
    @Query('page')             rawPage?:             string,
    @Query('limit')            rawLimit?:            string,
    @Query('linkedCalendarId') linkedCalendarId?:    string,
    @Query('dateFrom')         dateFrom?:            string,
    @Query('dateTo')           dateTo?:              string,
    @Query('search')           search?:              string,
  ) {
    const businessId = this.resolveCompanyId(ctx);
    const params: BiShiftAssignmentListParams = {
      businessId,
      page:             rawPage  ? Math.max(1,   Number(rawPage))             : 1,
      limit:            rawLimit ? Math.min(200, Math.max(1, Number(rawLimit))) : 50,
      linkedCalendarId: linkedCalendarId || undefined,
      dateFrom:         dateFrom         || undefined,
      dateTo:           dateTo           || undefined,
      search:           search           || undefined,
    };
    try {
      return await this.bi.getPendingShiftAssignments(params);
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        throw new ServiceUnavailableException(
          'Business Intelligence service is unavailable',
        );
      }
      throw err;
    }
  }
}
