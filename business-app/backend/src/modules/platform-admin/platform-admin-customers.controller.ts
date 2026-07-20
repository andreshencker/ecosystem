import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
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
import { PlatformAdminCustomerQueryDto } from './dto/platform-admin-customer-query.dto';

/**
 * Read-only Platform Admin view of all Customers across tenants.
 *
 * All Customer data comes exclusively from the BI service (/internal/customers).
 * No MongoDB Customer collection is queried here.
 *
 * Authorization: platform_admin role only. Business-scoped users receive 403.
 *
 * BI error mapping:
 *   connection_refused / timeout  → 503 Service Unavailable
 *   auth_error (401/403)          → 502 (BI integration misconfiguration)
 *   not_found (404)               → 502 (BI endpoint missing)
 *   validation_error (422)        → 400 Bad Request
 *   bi_internal_error (500)       → 502 Bad Gateway
 *   unknown                       → 503 Service Unavailable
 */
@ApiTags('Platform Admin — Customers')
@ApiBearerAuth()
@Controller('platform-admin/customers')
export class PlatformAdminCustomersController {
  private readonly logger = new Logger(PlatformAdminCustomersController.name);

  constructor(private readonly bi: BusinessIntelligenceService) {}

  private assertPlatformAdmin(ctx: AuthContext): void {
    if (ctx.role !== 'platform_admin') {
      throw new ForbiddenException(
        'This endpoint is restricted to Platform Administrators.',
      );
    }
  }

  /** Map a BIUnavailableError to an appropriate NestJS HttpException. */
  private mapBIError(err: BIUnavailableError, context: string): HttpException {
    this.logger.error(
      `[PlatformAdmin] ${context} — BI error category=${err.category} status=${err.statusCode ?? 'none'}: ${err.message}`,
    );

    switch (err.category) {
      case 'connection_refused':
      case 'timeout':
        return new ServiceUnavailableException(
          'Customer analytics are temporarily unavailable. Please verify that the Business Intelligence service is running.',
        );
      case 'auth_error':
        return new ServiceUnavailableException(
          'Business Intelligence integration authentication failed. Please contact the platform administrator.',
        );
      case 'not_found':
        return new ServiceUnavailableException(
          'The Business Intelligence customer endpoint was not found. Please verify the BI service version.',
        );
      case 'validation_error':
        // 422 from BI = our query params were invalid — surface as 400
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
          'Customer analytics are temporarily unavailable. Please try again later.',
        );
    }
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'List all customers across tenants (Platform Admin only, proxied from BI)',
  })
  async listCustomers(
    @CurrentUser() ctx: AuthContext,
    @Query() query: PlatformAdminCustomerQueryDto,
  ) {
    this.assertPlatformAdmin(ctx);

    this.logger.log(
      `[PlatformAdmin] GET /platform-admin/customers — user=${ctx.userId} ` +
        `filters: businessId=${query.businessId ?? '-'} search=${query.search ?? '-'} ` +
        `page=${query.page ?? 1} limit=${query.limit ?? 50}`,
    );

    try {
      return await this.bi.listPlatformAdminCustomers({
        businessId: query.businessId,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
        search: query.search,
        isActive: query.isActive,
        customerType: query.customerType,
        hasContacts: query.hasContacts,
        hasLocations: query.hasLocations,
        hasCommunicationConfiguration: query.hasCommunicationConfiguration,
        hasDataQualityIssues: query.hasDataQualityIssues,
      });
    } catch (err) {
      if (err instanceof BIUnavailableError) {
        throw this.mapBIError(err, 'listCustomers');
      }
      throw err;
    }
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Get full customer analytical profile (Platform Admin only, proxied from BI)',
  })
  @ApiParam({
    name: 'id',
    description: 'BI customer ID (customerId from list response)',
  })
  async getCustomer(
    @CurrentUser() ctx: AuthContext,
    @Param('id') id: string,
    @Query('businessId') businessId?: string,
  ) {
    this.assertPlatformAdmin(ctx);

    this.logger.log(
      `[PlatformAdmin] GET /platform-admin/customers/${id} — user=${ctx.userId} businessId=${businessId ?? '-'}`,
    );

    try {
      const detail = await this.bi.getPlatformAdminCustomerDetail(id, businessId);
      if (!detail) {
        throw new NotFoundException(`Customer '${id}' was not found.`);
      }
      return detail;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (err instanceof BIUnavailableError) {
        throw this.mapBIError(err, `getCustomer(${id})`);
      }
      throw err;
    }
  }
}
