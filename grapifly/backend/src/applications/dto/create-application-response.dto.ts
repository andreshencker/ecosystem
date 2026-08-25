import type { ApplicationResponseDto } from './application-response.dto';

/**
 * Returned only once, right after creation — `serviceSecret` is the
 * plaintext secret for this app's service-to-service calls into Grapifly.
 * Only its SHA-256 hash is persisted; it cannot be retrieved again.
 */
export interface CreateApplicationResponseDto extends ApplicationResponseDto {
  serviceSecret: string;
}
