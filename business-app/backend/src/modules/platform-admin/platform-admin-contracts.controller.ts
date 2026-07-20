import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  Logger,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { BusinessIntelligenceService } from '../../integrations/business-intelligence/business-intelligence.service';
import { BIUnavailableError } from '../../integrations/business-intelligence/errors/bi-unavailable.error';
import {
  PlatformAdminContractQueryDto,
  PlatformAdminContractSummaryQueryDto,
} from './dto/platform-admin-contract-query.dto';

/**
 * Read-only Platform Admin view of all Contracts across tenants.
 *
 * All Contract data comes exclusively from the BI service (/internal/contracts/admin).
 * No MongoDB Contract collection is queried here.
 * No calculations are performed here — all metrics come from BI.
 *
 * Authorization: platform_admin role only. Business-scoped users receive 403.
 *
 * BI error mapping:
 *   connection_refused / timeout  → 503 Service Unavailable
 *   auth_error (401/403)          → 503 (BI integration misconfiguration)
 *   not_found (404)               → 503 (BI endpoint missing)
 *   validation_error (422)        → 400 Bad Request
 *   bi_internal_error (500)       → 503 Bad Gateway
 *   unknown                       → 503 Service Unavailable
 */
@ApiTags('Platform Admin — Contracts')
@ApiBearerAuth()
@Controller('platform-admin/contracts')
export class PlatformAdminContractsController {
  private readonly logger = new Logger(PlatformAdminContractsController.name);

  constructor(private readonly bi: BusinessIntelligenceService) {}

  private assertPlatformAdmin(ctx: AuthContext): void {
    if (ctx.role !== 'platform_admin') {
      throw new ForbiddenException(
        'This endpoint is restricted to Platform Administrators.',
      );
    }
  }

  private mapBIError(err: BIUnavailableError, context: string): HttpException {
    this.logger.error(
      `[PlatformAdmin/Contracts] ${context} — BI error category=${err.category} status=${err.statusCode ?? 'none'}: ${err.message}`,
    );

    switch (err.category) {
      case 'connection_refused':
      case 'timeout':
        return new ServiceUnavailableException(
          'Contract analytics are temporarily unavailable. Please verify that the Business Intelligence service is running.',
        );
      case 'auth_error':
        return new ServiceUnavailableException(
          'Business Intelligence integration authentication failed. Please contact the platform administrator.',
        );
      case 'not_found':
        return new ServiceUnavailableException(
          'The Business Intelligence contracts endpoint was not found. Please verify the BI service version.',
        );
      case 'validation_error':
        return new HttpException(
          'Invalid query parameters sent to Business Intelligence.',
          400,
        );
      case 'bi_internal_error':
        return new ServiceUnavailableException(
          'The Business Intelligence service encountered an internal error. Please try again later.',
        );
      default:
        return new ServiceUnavailableException(
          'Contract analytics are temporarily unavailable. Please try again later.',
        );
    }
  }

  @Get('summary')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Contract admin summary — measures and KPIs (Platform Admin only, proxied from BI)',
  })
  async getSummary(
    @CurrentUser() ctx: AuthContext,
    @Query() query: PlatformAdminContractSummaryQueryDto,
  ) {
    this.assertPlatformAdmin(ctx);

    this.logger.log(
      `[PlatformAdmin/Contracts] GET summary — user=${ctx.userId} ` +
        `businessId=${query.businessId ?? '-'} status=${query.status ?? '-'}`,
    );

    try {
      return await this.bi.getContractAdminSummary({
        businessId: query.businessId,
        status: query.status,
        createdFrom: query.createdFrom,
        createdTo: query.createdTo,
      });
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        throw this.mapBIError(err, 'getSummary');
      }
      throw err;
    }
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: 'List all contracts across tenants (Platform Admin only, proxied from BI)',
  })
  async listContracts(
    @CurrentUser() ctx: AuthContext,
    @Query() query: PlatformAdminContractQueryDto,
  ) {
    this.assertPlatformAdmin(ctx);

    this.logger.log(
      `[PlatformAdmin/Contracts] GET list — user=${ctx.userId} ` +
        `businessId=${query.businessId ?? '-'} search=${query.search ?? '-'} ` +
        `status=${query.status ?? '-'} configStatus=${query.configurationStatus ?? '-'} ` +
        `page=${query.page ?? 1} limit=${query.limit ?? 50}`,
    );

    try {
      return await this.bi.listPlatformAdminContracts({
        businessId: query.businessId,
        customerId: query.customerId,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
        search: query.search,
        status: query.status,
        workType: query.workType,
        billingCycle: query.billingCycle,
        currency: query.currency,
        configurationStatus: query.configurationStatus,
        chargeGst: query.chargeGst,
        superEnabled: query.superEnabled,
        holidayRulesEnabled: query.holidayRulesEnabled,
        paymentCalendarEnabled: query.paymentCalendarEnabled,
        updatedFrom: query.updatedFrom,
        updatedTo: query.updatedTo,
        sortBy: query.sortBy,
        sortDir: query.sortDir,
      });
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        throw this.mapBIError(err, 'listContracts');
      }
      throw err;
    }
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get full contract admin detail (Platform Admin only, proxied from BI)',
  })
  @ApiParam({ name: 'id', description: 'Contract source_id (MongoDB ObjectId)' })
  async getContract(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Query('businessId') businessId?: string,
  ) {
    this.assertPlatformAdmin(ctx);

    this.logger.log(
      `[PlatformAdmin/Contracts] GET detail — user=${ctx.userId} contractId=${id} businessId=${businessId ?? '-'}`,
    );

    try {
      const detail = await this.bi.getPlatformAdminContractDetail(id, businessId);
      if (!detail) {
        throw new NotFoundException(`Contract '${id}' was not found.`);
      }
      return detail;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (err instanceof BIUnavailableError) {
        throw this.mapBIError(err, `getContract(${id})`);
      }
      throw err;
    }
  }

  @Get(':id/issues')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get support issues for a single contract (Platform Admin only, proxied from BI)',
  })
  @ApiParam({ name: 'id', description: 'Contract source_id (MongoDB ObjectId)' })
  async getContractIssues(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Query('businessId') businessId?: string,
  ) {
    this.assertPlatformAdmin(ctx);

    this.logger.log(
      `[PlatformAdmin/Contracts] GET issues — user=${ctx.userId} contractId=${id}`,
    );

    try {
      const result = await this.bi.getPlatformAdminContractSupportIssues(id, businessId);
      if (!result) {
        throw new NotFoundException(`Contract '${id}' was not found.`);
      }
      return result;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (err instanceof BIUnavailableError) {
        throw this.mapBIError(err, `getContractIssues(${id})`);
      }
      throw err;
    }
  }
}
