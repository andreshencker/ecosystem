export type DocumentFormat = 'pdf' | 'xlsx' | 'csv';

export interface DocumentSeed {
  documentKey: string;
  displayName: string;
  description: string;
  formatContracts: Record<string, Record<string, unknown>>;
}

export interface DocumentDomainSeed {
  domainKey: string;
  displayName: string;
  description: string;
  domainCategory: string;
  allowedFormats: DocumentFormat[];
  documents: DocumentSeed[];
}
