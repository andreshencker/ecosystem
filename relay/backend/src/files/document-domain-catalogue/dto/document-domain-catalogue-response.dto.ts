export class DocumentDomainCatalogueResponseDto {
  id!: string;
  companyId!: string;
  domainKey!: string;
  displayName!: string;
  description!: string;
  domainCategory!: string;
  allowedFormats!: string[];
  isActive!: boolean;
  isSystem!: boolean;
  createdAt!: string;
  updatedAt!: string;
}
