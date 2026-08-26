export class StorageDomainCatalogueResponseDto {
  id!: string;
  companyId!: string;
  providerCredentialsId!: string;
  domainKey!: string;
  visibility!: 'public' | 'private';
  displayName!: string;
  description!: string;
  isActive!: boolean;
  isSystem!: boolean;
  createdAt!: string;
  updatedAt!: string;
}
