export interface BiSemanticDomainSummary {
    dimensions: string[];
    measures: string[];
    kpis: string[];
}
export interface BiSemanticIndex {
    domains: string[];
    detail: Record<string, BiSemanticDomainSummary>;
}
export interface BiSemanticDomainDetail {
    domain: string;
    dimensions: Record<string, unknown>;
    measures: Record<string, unknown>;
    kpis: Record<string, unknown>;
}
export type BiSemanticMetadata = BiSemanticIndex | BiSemanticDomainDetail;
