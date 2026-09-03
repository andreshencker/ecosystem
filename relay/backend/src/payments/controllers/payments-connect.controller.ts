import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import {
  CreateConnectCheckoutDto,
  CreateConnectedPaymentAccountDto,
  CreateConnectOnboardingDto,
} from '../dto/payment-connect.dto';
import { PaymentsConnectService } from '../services/payments-connect.service';

class ConnectAccountsQueryDto {
  @IsMongoId() connectionId!: string;
}

@ApiTags('Payments — Connect')
@ApiBearerAuth()
@Controller('payments/connect')
export class PaymentsConnectController {
  constructor(private readonly connect: PaymentsConnectService) {}

  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      "Create or return a connected account using the authenticated tenant's payment connection",
  })
  createAccount(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreateConnectedPaymentAccountDto,
  ) {
    return this.connect.createAccount(this.companyId(ctx), dto);
  }

  @Get('accounts')
  listAccounts(
    @CurrentUser() ctx: AuthContext,
    @Query() query: ConnectAccountsQueryDto,
  ) {
    return this.connect.listAccounts(this.companyId(ctx), query.connectionId);
  }

  @Post('accounts/:accountId/refresh')
  refreshAccount(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
  ) {
    return this.connect.refreshAccount(this.companyId(ctx), accountId);
  }

  @Post('accounts/:accountId/onboarding')
  createOnboarding(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
    @Body() dto: CreateConnectOnboardingDto,
  ) {
    return this.connect.createOnboarding(
      this.companyId(ctx),
      accountId,
      dto.refreshUrl,
      dto.returnUrl,
    );
  }

  @Post('accounts/:accountId/session')
  createAccountSession(
    @CurrentUser() ctx: AuthContext,
    @Param('accountId') accountId: string,
  ) {
    return this.connect.createAccountSession(this.companyId(ctx), accountId);
  }

  @Post('checkout-sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Execute a destination charge instruction supplied by the calling application',
  })
  createCheckout(
    @CurrentUser() ctx: AuthContext,
    @Body() dto: CreateConnectCheckoutDto,
  ) {
    return this.connect.createCheckout(this.companyId(ctx), dto);
  }

  @Get('executions/:executionId')
  getExecution(
    @CurrentUser() ctx: AuthContext,
    @Param('executionId') executionId: string,
  ) {
    return this.connect.getExecution(this.companyId(ctx), executionId);
  }

  private companyId(ctx: AuthContext): string {
    if (!ctx?.companyId)
      throw new UnauthorizedException(
        'No company context in authentication token.',
      );
    return ctx.companyId;
  }
}
