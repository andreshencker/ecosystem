// src/files/generator/renderers/csv/csv-renderer.service.ts
import { Injectable } from '@nestjs/common';
import type { IFileRenderer, RenderInput } from '../renderer.interface';
import type { FileFormat } from '../../utils/mime.util';
import { normalizeColumns } from '../../utils/columns.util';

type CsvMode = 'clean' | 'full';

function escapeCsv(v: any) {
  const s = v === null || v === undefined ? '' : String(v);
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

@Injectable()
export class CsvRendererService implements IFileRenderer {
  supports(format: FileFormat): boolean {
    return format === 'csv';
  }

  async render(input: RenderInput): Promise<Buffer> {
    const mode: CsvMode = (input.payload?.mode ?? 'full') as CsvMode;

    const table = input.payload?.table;
    if (!table) throw new Error('CSV renderer requires payload.table');

    const columns = normalizeColumns(table.columns);
    const rawRows: any[] = Array.isArray(table.rows) ? table.rows : [];

    if (columns.length === 0) throw new Error('CSV requires table.columns');

    // special rows: row.__kind = 'subtotal' | 'total'
    const isSpecial = (row: any) =>
      row?.__kind === 'subtotal' || row?.__kind === 'total';

    const rows =
      mode === 'clean' ? rawRows.filter((r) => !isSpecial(r)) : rawRows;

    const header = columns.map((c) => escapeCsv(c.label)).join(',');

    const body = rows
      .map((row) => {
        if (Array.isArray(row)) return row.map(escapeCsv).join(',');

        const special = isSpecial(row);

        return columns
          .map((c, idx) => {
            if (special && idx === 0) {
              return escapeCsv(
                row?.label ?? (row.__kind === 'total' ? 'Totals' : 'Subtotal'),
              );
            }
            return escapeCsv(row?.[c.key]);
          })
          .join(',');
      })
      .join('\n');

    const out = `${header}\n${body}\n`;
    return Buffer.from(out, 'utf8');
  }
}
