// src/files/generator/builders/csv-content.builder.ts
//
// Translates a CsvFormatContract + runtime data into the CsvPayload shape
// expected by CsvRendererService.render().

import { getAtPath } from '../validators/runtime-data.validator';

export interface CsvBuilderResult {
  mode?: 'clean' | 'full';
  table: {
    columns: Array<{ key: string; label: string }>;
    rows: any[];
  };
}

/**
 * Builds the CsvPayload from a CSV format contract + runtime data.
 *
 *  - Resolves rows via dataPath (preferred) or legacy dataSource.
 *  - Maps column definitions from the contract.
 *  - mode defaults to 'clean' (strips __kind subtotal/total rows) unless the
 *    caller sets contract.mode = 'full'.
 */
export function buildCsvContent(
  contract: Record<string, any>,
  data: Record<string, any>,
): CsvBuilderResult {
  // v2 dataPath preferred over legacy dataSource
  const dataPath: string =
    contract.dataPath?.trim() || contract.dataSource?.trim() || '';
  const rows: any[] = dataPath ? (getAtPath(data, dataPath) ?? []) : [];

  if (!Array.isArray(rows)) {
    throw new Error(
      `CSV contract: data.${dataPath} is not an array (got ${typeof rows})`,
    );
  }

  const columns: any[] = Array.isArray(contract.columns)
    ? contract.columns
    : [];
  const mappedColumns = columns.map((c: any) => ({
    key: c.key,
    label: c.label || c.key,
  }));

  if (mappedColumns.length === 0) {
    throw new Error('CSV contract has no columns defined');
  }

  return {
    mode: contract.mode === 'full' ? 'full' : 'clean',
    table: { columns: mappedColumns, rows },
  };
}
