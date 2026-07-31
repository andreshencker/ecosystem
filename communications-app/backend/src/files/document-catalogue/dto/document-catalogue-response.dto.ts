export class DocumentCatalogueResponseDto {
  id!: string;
  documentDomainCatalogueId!: string | Record<string, any>;
  documentKey!: string;
  displayName!: string;
  description!: string;
  formatContracts!: Record<string, any>;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;
  /** Populated when populateDocumentDomain=true */
  documentDomain?: Record<string, any>;
}
