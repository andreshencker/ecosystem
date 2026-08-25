import type { CommunicationTokenResponseDto } from './communication-token-response.dto';

/**
 * Returned only once, right after creation — `token` is the plaintext
 * secret. Only its SHA-256 hash is persisted; it cannot be retrieved again.
 */
export interface CreateCommunicationTokenResponseDto extends CommunicationTokenResponseDto {
  token: string;
}
