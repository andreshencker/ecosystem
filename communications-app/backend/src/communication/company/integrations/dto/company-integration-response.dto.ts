/** Shape returned to clients — tokenHash is intentionally excluded. */
export class CompanyIntegrationResponseDto {
  id!: string;
  companyId!: string;
  integrationKey!: string;
  displayName!: string;
  description!: string;
  environment!: string;
  /** Safe display prefix. Raw token is NEVER included in list/get responses. */
  tokenPrefix!: string;
  isActive!: boolean;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdBy?: string | null;
  createdAt!: string;
  updatedAt!: string;
}

/** Extended response for create / rotate-token — includes the raw token ONCE. */
export class CompanyIntegrationWithTokenDto extends CompanyIntegrationResponseDto {
  /** Raw token shown ONLY on create or rotate. Store it — it cannot be recovered. */
  rawToken!: string;
}

/** Platform Admin view — includes company context; tokenHash never included. */
export class CompanyIntegrationPlatformViewDto extends CompanyIntegrationResponseDto {
  /** Resolved from Company.displayName */
  companyDisplayName!: string;
  /** Resolved from Company.companyKey */
  companyKey!: string;
}
