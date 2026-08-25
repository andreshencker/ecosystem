// src/files/generator/builders/xlsx-content.builder.ts
//
// Translates an XlsxFormatContract + runtime data into the XlsxPayload shape
// expected by XlsxRendererService.render().
//
// Important limitation: the current XlsxRendererService creates ONE worksheet
// per call via payload.table.  When a contract declares multiple worksheets,
// only the first enabled worksheet is used.  This is documented in Help & Examples.

import { getAtPath } from '../validators/runtime-data.validator';

export interface XlsxBuilderResult {
  meta: { title?: string; sheetName?: string };
  table: {
    title?: string;
    columns: Array<{ key: string; label: string }>;
    rows: any[];
  };
  totals?: {
    title?: string;
    items: Array<{
      label: string;
      value: string | number;
      emphasis?: 'strong';
    }>;
  };
  notes?: { title?: string; items: string[] };
}

/**
 * Builds the XlsxPayload from an XLSX format contract + runtime data.
 *
 * For each worksheet (only the first is used by the current renderer):
 *  - resolves rows via dataPath (preferred) or dataSource
 *  - maps columns from the contract definition
 *
 * Totals and notes fields in the contract are promoted to the top-level
 * payload when present (optional, renderer renders them as a separate block).
 */
export function buildXlsxContent(
  contract: Record<string, any>,
  data: Record<string, any>,
): XlsxBuilderResult {
  const worksheets: any[] = Array.isArray(contract.worksheets)
    ? contract.worksheets
    : [];

  if (worksheets.length === 0) {
    throw new Error('XLSX contract has no worksheets defined');
  }

  // Use the first worksheet — the current renderer creates a single sheet.
  const ws = worksheets[0];
  const dataPath: string = ws.dataPath?.trim() || ws.dataSource?.trim() || '';
  const rows: any[] = dataPath ? (getAtPath(data, dataPath) ?? []) : [];

  if (!Array.isArray(rows)) {
    throw new Error(
      `XLSX worksheet "${ws.key}": data.${dataPath} is not an array (got ${typeof rows})`,
    );
  }

  const columns: any[] = Array.isArray(ws.columns) ? ws.columns : [];
  const mappedColumns = columns.map((c: any) => ({
    key: c.key,
    label: c.label || c.key,
  }));

  const result: XlsxBuilderResult = {
    meta: {
      title: data['title'] ?? '',
      sheetName: ws.label || ws.key || 'Report',
    },
    table: {
      title: ws.label || ws.key || '',
      columns: mappedColumns,
      rows,
    },
  };

  // Totals from runtime data — the contract may declare a totalsPath
  if (contract.totalsPath?.trim()) {
    const totalsObj = getAtPath(data, contract.totalsPath);
    if (totalsObj && typeof totalsObj === 'object') {
      result.totals = {
        title: 'Totals',
        items: Object.entries(totalsObj).map(([k, v]) => ({
          label: k,
          value: v as string | number,
        })),
      };
    }
  }

  // Notes from runtime data
  if (contract.notesPath?.trim()) {
    const notesArr = getAtPath(data, contract.notesPath);
    if (Array.isArray(notesArr)) {
      result.notes = { title: 'Notes', items: notesArr.map(String) };
    }
  }

  return result;
}
