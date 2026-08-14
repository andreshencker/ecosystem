// src/files/generator/utils/xlsx-autofit.util.ts
import type ExcelJS from 'exceljs';

type AutoFitOptions = {
  fromCol: number;
  toCol: number;
  minWidth?: number;
  maxWidth?: number;
  padding?: number;
  fromRow?: number;
  toRow?: number;
};

export function autoFitColumns(ws: ExcelJS.Worksheet, opts: AutoFitOptions) {
  const {
    fromCol,
    toCol,
    minWidth = 10,
    maxWidth = 45,
    padding = 2,
    fromRow = 1,
    toRow = ws.rowCount,
  } = opts;

  for (let col = fromCol; col <= toCol; col++) {
    let maxLen = 0;

    for (let row = fromRow; row <= toRow; row++) {
      const cell = ws.getCell(row, col);
      const v = cell.value;

      let text = '';
      if (v === null || v === undefined) text = '';
      else if (typeof v === 'string') text = v;
      else if (typeof v === 'number') text = String(v);
      else if (v instanceof Date) text = v.toISOString().slice(0, 10);
      else if (typeof v === 'object' && (v as any).text)
        text = String((v as any).text);
      else if (typeof v === 'object' && (v as any).result != null)
        text = String((v as any).result);
      else text = String(v);

      text = text.replace(/\s+/g, ' ').trim();
      maxLen = Math.max(maxLen, text.length);
    }

    const width = Math.min(maxWidth, Math.max(minWidth, maxLen + padding));
    ws.getColumn(col).width = width;
  }
}
