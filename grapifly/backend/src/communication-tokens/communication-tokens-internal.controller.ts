import { Body, Controller, Post } from '@nestjs/common';
import { CommunicationTokensService } from './communication-tokens.service';
import { ValidateCommunicationTokenDto } from './dto/validate-communication-token.dto';

/**
 * Machine-to-machine surface — called by other apps (e.g. Relay) to verify
 * a communication token presented by an external caller. The token itself
 * is the credential; no additional app-level auth is layered on yet (that's
 * the deferred "internal communication via the Applications catalog" work).
 */
@Controller('internal/communication-tokens')
export class CommunicationTokensInternalController {
  constructor(private readonly tokens: CommunicationTokensService) {}

  @Post('validate')
  validate(@Body() body: ValidateCommunicationTokenDto) {
    return this.tokens.validate(body.token);
  }
}
