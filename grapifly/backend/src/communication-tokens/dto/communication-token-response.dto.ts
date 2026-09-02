/**
 * What a communication token looks like over the wire — never the raw
 * token or its hash, only the safe display prefix.
 */
export interface CommunicationTokenResponseDto {
  tokenId: string;
  organizationId: string;
  name: string;
  description: string;
  tokenPrefix: string;
  status: 'active' | 'revoked';
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdBy: string;
}

export function toCommunicationTokenResponse(entry: CommunicationTokenResponseDto): CommunicationTokenResponseDto {
  return {
    tokenId: entry.tokenId,
    organizationId: entry.organizationId,
    name: entry.name,
    description: entry.description,
    tokenPrefix: entry.tokenPrefix,
    status: entry.status,
    lastUsedAt: entry.lastUsedAt,
    expiresAt: entry.expiresAt,
    createdBy: entry.createdBy,
  };
}
