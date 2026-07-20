// src/files/generator/renderers/xlsx/xlsx-renderer.service.ts
import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

import type { IFileRenderer, RenderInput } from '../renderer.interface';
import type { FileFormat } from '../../utils/mime.util';
import { normalizeColumns } from '../../utils/columns.util';
import { autoFitColumns } from '../../utils/xlsx-autofit.util';

function safeNumber(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isNumericKey(key: string) {
  return /^(amount|balance|qty|quantity|price|pnl|total|fee|fees|debit|credit|value)$/i.test(
    key,
  );
}

type XlsxPayload = {
  meta?: {
    title?: string;
    sheetName?: string;
    createdBy?: string;
  };
  table: {
    title?: string;
    columns: any[];
    rows: any[];
  };
  notes?: {
    title?: string;
    items: string[];
  };
  totals?: {
    title?: string;
    items: Array<{
      label: string;
      value: string | number;
      emphasis?: 'strong';
    }>;
  };
};

@Injectable()
export class XlsxRendererService implements IFileRenderer {
  supports(format: FileFormat): boolean {
    return format === 'xlsx';
  }

  async render(input: RenderInput): Promise<Buffer> {
    const payload = input.payload as XlsxPayload;
    if (!payload?.table)
      throw new Error('XLSX renderer requires payload.table');

    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    wb.creator = payload?.meta?.createdBy ?? 'JTrade';

    const sheetName = payload?.meta?.sheetName ?? 'Report';
    const ws = wb.addWorksheet(sheetName);

    let r = 1;

    // Title (optional)
    const title = payload?.meta?.title ?? payload?.table?.title ?? '';
    if (title) {
      ws.getCell(r, 1).value = title;
      ws.getCell(r, 1).font = { bold: true, size: 14 };
      r += 2;
    }

    // Table
    const columns = normalizeColumns(payload.table.columns);
    const rows: any[] = Array.isArray(payload.table.rows)
      ? payload.table.rows
      : [];

    if (columns.length === 0) throw new Error('XLSX requires table.columns');

    const firstCol = 1;
    const lastCol = firstCol + columns.length - 1;

    // Header row
    columns.forEach((c, idx) => {
      const cell = ws.getCell(r, firstCol + idx);
      cell.value = c.label;
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF6E7B7' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      };
    });

    ws.autoFilter = {
      from: { row: r, column: firstCol },
      to: { row: r, column: lastCol },
    };

    r += 1;

    const isSpecial = (row: any) =>
      row?.__kind === 'subtotal' || row?.__kind === 'total';

    for (const row of rows) {
      for (let j = 0; j < columns.length; j++) {
        const col = columns[j];
        const key = col.key;
        const cell = ws.getCell(r, firstCol + j);

        let value = Array.isArray(row) ? row[j] : row?.[key];
        if (isSpecial(row) && j === 0)
          value =
            row?.label ?? (row.__kind === 'total' ? 'Totals' : 'Subtotal');

        // Basic formatting
        const n = safeNumber(value);
        if (!isSpecial(row) && n !== null && isNumericKey(key)) {
          cell.value = n;
          cell.numFmt = '#,##0.00';
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.value = value ?? '';
          cell.alignment = {
            vertical: 'middle',
            horizontal: isNumericKey(key) ? 'right' : 'left',
          };
        }

        // Border
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE6E6E6' } },
          left: { style: 'thin', color: { argb: 'FFE6E6E6' } },
          bottom: { style: 'thin', color: { argb: 'FFE6E6E6' } },
          right: { style: 'thin', color: { argb: 'FFE6E6E6' } },
        };

        // Special style in-range
        if (isSpecial(row)) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: row.__kind === 'total' ? 'FFF3D57A' : 'FFF9EBC2' },
          };
          cell.font = { ...(cell.font ?? {}), bold: true };
        }
      }

      r += 1;
    }

    r += 1;

    // Totals block (optional)
    if (payload?.totals?.items?.length) {
      ws.getCell(r, 1).value = payload.totals.title ?? 'Totals';
      ws.getCell(r, 1).font = { bold: true, size: 12 };
      r += 1;

      for (const it of payload.totals.items) {
        ws.getCell(r, 1).value = String(it.label ?? '');
        ws.getCell(r, 1).font = { size: 10, color: { argb: 'FF6B7280' } };

        const n = safeNumber(it.value);
        if (n !== null) {
          ws.getCell(r, 2).value = n;
          ws.getCell(r, 2).numFmt = '#,##0.00';
        } else {
          ws.getCell(r, 2).value = String(it.value ?? '');
        }

        ws.getCell(r, 2).font =
          it.emphasis === 'strong' ? { bold: true, size: 11 } : { size: 10 };
        ws.getCell(r, 2).alignment = { horizontal: 'right' };

        r += 1;
      }

      r += 1;
    }

    // Notes (optional)
    if (payload?.notes?.items?.length) {
      ws.getCell(r, 1).value = payload.notes.title ?? 'Notes';
      ws.getCell(r, 1).font = { bold: true, size: 12 };
      r += 1;

      for (const item of payload.notes.items) {
        ws.getCell(r, 1).value = `• ${String(item ?? '')}`;
        ws.getCell(r, 1).alignment = {
          wrapText: true,
          vertical: 'top',
          horizontal: 'left',
        };
        ws.getCell(r, 1).font = { size: 10, color: { argb: 'FF6B7280' } };
        r += 1;
      }
    }

    // Autofit only for the table range
    autoFitColumns(ws, {
      fromCol: firstCol,
      toCol: lastCol,
      minWidth: 10,
      maxWidth: 45,
      padding: 2,
      fromRow: 1,
      toRow: ws.rowCount,
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf as any);
  }
}
