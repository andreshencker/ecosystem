// src/files/reports/types/report-payload.types.ts
export type ReportSection =
  | ReportHtmlSection
  | ReportSummarySection
  | ReportNotesSection
  | ReportTableSection
  | ReportTotalsSection;

export type ReportPayload = {
  meta?: {
    title?: string;
    subtitle?: string;
    generatedAtIso?: string; // opcional (si no viene, se genera)
  };
  sections?: ReportSection[];
};

/** ===== HTML RAW ===== */
export type ReportHtmlSection = {
  type: 'html';
  html: string; // ya viene armado (casos especiales)
};

/** ===== SUMMARY ===== */
export type ReportSummaryCard = {
  label: string;
  value: string | number | null;
  hint?: string;
};

export type ReportSummarySection = {
  type: 'summary';
  title?: string;
  cards: ReportSummaryCard[];
};

/** ===== NOTES ===== */
export type ReportNotesSection = {
  type: 'notes';
  title?: string;
  items: string[];
};

/** ===== TABLE ===== */
export type ReportTableColumn = string | { key: string; label?: string };

export type ReportTableRow =
  | Record<string, any>
  | any[]
  | {
      __kind: 'subtotal' | 'total'; // para estilos/labels en tabla
      label?: string;
      [k: string]: any;
    };

export type ReportTableSection = {
  type: 'table';
  title?: string;
  columns: ReportTableColumn[];
  rows: ReportTableRow[];
};

/** ===== TOTALS ===== */
export type ReportTotalsItem = {
  label: string;
  value: string | number | null;
  hint?: string;
  emphasis?: 'strong';
};

export type ReportTotalsSection = {
  type: 'totals';
  title?: string;
  position?: 'beforeTable' | 'afterTable'; // por si luego quieres orden
  items: ReportTotalsItem[];
};
