import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Save (create or replace) a connection token. */
export class SaveConnectionDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Test a token.
 * - If token is provided: tests that token without persisting anything.
 * - If absent: tests the stored encrypted token and persists the result.
 */
export class TestConnectionDto {
  @IsOptional()
  @IsString()
  token?: string;
}

/** Toggle active/inactive state without changing the token. */
export class ToggleConnectionDto {
  @IsBoolean()
  isActive!: boolean;
}

/** Shape returned to the frontend — never includes the full token. */
export class IntegrationConnectionResponseDto {
  id!: string;
  provider!: string;
  tokenPrefix!: string;
  isActive!: boolean;
  remoteCompanyId!: string | null;
  lastTestedAt!: string | null;
  lastStatus!: 'connected' | 'failed' | null;
  lastError!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static from(doc: any): IntegrationConnectionResponseDto {
    return {
      id: String(doc._id),
      provider: (doc.provider as string | undefined) ?? 'communications',
      tokenPrefix: (doc.tokenPrefix as string | undefined) ?? '',
      isActive: (doc.isActive as boolean | undefined) ?? true,
      remoteCompanyId:
        (doc.remoteCompanyId as string | null | undefined) ?? null,
      lastTestedAt: doc.lastTestedAt
        ? new Date(doc.lastTestedAt as Date).toISOString()
        : null,
      lastStatus:
        (doc.lastStatus as 'connected' | 'failed' | null | undefined) ?? null,
      lastError: (doc.lastError as string | null | undefined) ?? null,
      createdAt: new Date(doc.createdAt as Date).toISOString(),
      updatedAt: new Date(doc.updatedAt as Date).toISOString(),
    };
  }
}
