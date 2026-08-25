import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { CommunicationTokenValidatorService } from './communication-token-validator.service';

/**
 * Same path/header contract as the old CompanyIntegrationsController's
 * GET /company-integrations/me — kept unchanged so Business App (and any
 * other external caller) needs no code changes after this migration.
 * Protected implicitly by GlobalAuthGuard step 4, which already validates
 * this same x-integration-token header before this handler runs.
 */
@Controller('company-integrations')
export class CommunicationTokenValidatorController {
  constructor(private readonly validator: CommunicationTokenValidatorService) {}

  @Get('me')
  async me(@Headers('x-integration-token') token: string) {
    if (!token?.trim()) {
      throw new UnauthorizedException('x-integration-token header is required');
    }
    return this.validator.resolveCompanyByToken(token.trim());
  }
}
