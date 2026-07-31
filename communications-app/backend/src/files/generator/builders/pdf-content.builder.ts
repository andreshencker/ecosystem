// src/files/generator/builders/pdf-content.builder.ts
//
// Translates a PdfFormatContract + runtime data into the ReportPayload shape
// expected by ReportContentBuilder.build().  Reuses the existing section types
// (html, summary, table, totals, notes) without changing how they render.

import { getAtPath } from '../validators/runtime-data.validator';
import type {
  ReportPayload,
  ReportSection,
} from '../../reports/types/report-payload.types';

function formatValue(
  value: any,
  fieldType?: string,
  fieldFormat?: string,
): string {
  if (value === undefined || value === null) return '';

  if (
    (fieldType === 'currency' || fieldFormat === 'currency') &&
    typeof value === 'number'
  ) {
    return value.toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
    });
  }

  if (
    (fieldType === 'percentage' || fieldFormat === 'percentage') &&
    typeof value === 'number'
  ) {
    return `${value}%`;
  }

  if (
    fieldType === 'date' &&
    (typeof value === 'string' || value instanceof Date)
  ) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }

  return String(value);
}

/**
 * Builds a ReportPayload from a PDF format contract + runtime data.
 *
 * This is the bridge between the contract-driven generation flow and the
 * existing ReportContentBuilder / PdfRendererService.
 *
 * Rules:
 *  - Only sections with enabled=true are included.
 *  - If a section has a dataPath, the value at that path in `data` is used.
 *  - If dataPath is empty, the whole data object is used.
 *  - Section field/column definitions drive what is extracted from each row/object.
 *  - If a section has no field/column definitions, the raw value is passed through
 *    to preserve backward compatibility with contracts written before v2.
 */
export function buildPdfContent(
  contract: Record<string, any>,
  data: Record<string, any>,
): ReportPayload {
  const sections: ReportSection[] = [];

  for (const section of Array.isArray(contract.sections)
    ? contract.sections
    : []) {
    if (section.enabled === false) continue;

    const sectionPath: string = section.dataPath?.trim() ?? '';
    const rawValue = sectionPath ? getAtPath(data, sectionPath) : data;
    const sectionType: string = section.type ?? '';
    const sectionLabel: string = section.label ?? section.key ?? '';

    const fields: any[] = Array.isArray(section.fields) ? section.fields : [];
    const columns: any[] = Array.isArray(section.columns)
      ? section.columns
      : [];

    switch (sectionType) {
      case 'html': {
        // Build a simple key-value table HTML when field defs are present.
        // Fall back to raw html property if the contract predates v2.
        if (
          fields.length > 0 &&
          typeof rawValue === 'object' &&
          rawValue !== null
        ) {
          const rows = fields.map((f) => {
            const val = formatValue(rawValue[f.key], f.type, f.format);
            return `<tr><td style="font-weight:600;padding:4px 8px 4px 0;width:40%">${f.label || f.key}</td><td style="padding:4px 0">${val}</td></tr>`;
          });
          sections.push({
            type: 'html',
            html: `<table style="width:100%;font-size:11px;border-collapse:collapse">${rows.join('')}</table>`,
          });
        } else {
          // Legacy: raw html string in contract
          sections.push({ type: 'html', html: section.html ?? '' });
        }
        break;
      }

      case 'summary': {
        const cards =
          fields.length > 0 && typeof rawValue === 'object' && rawValue !== null
            ? fields.map((f) => ({
                label: f.label || f.key,
                value: formatValue(rawValue[f.key], f.type, f.format),
                hint: f.hint,
              }))
            : [];
        sections.push({ type: 'summary', title: sectionLabel, cards });
        break;
      }

      case 'table': {
        const colDefs = columns.length > 0 ? columns : [];
        const mappedColumns = colDefs.map((c: any) => ({
          key: c.key,
          label: c.label || c.key,
        }));
        const rows = Array.isArray(rawValue) ? rawValue : [];
        sections.push({
          type: 'table',
          title: sectionLabel,
          columns: mappedColumns,
          rows,
        });
        break;
      }

      case 'totals': {
        const items =
          fields.length > 0 && typeof rawValue === 'object' && rawValue !== null
            ? fields.map((f) => ({
                label: f.label || f.key,
                value: formatValue(rawValue[f.key], f.type, f.format),
                emphasis:
                  f.emphasis ??
                  (f.format === 'currency' && /total/i.test(f.key)
                    ? 'strong'
                    : undefined),
              }))
            : [];
        sections.push({ type: 'totals', title: sectionLabel, items });
        break;
      }

      case 'notes': {
        let items: string[] = [];
        if (Array.isArray(rawValue)) {
          items = rawValue.map((v) => String(v));
        } else if (
          fields.length > 0 &&
          typeof rawValue === 'object' &&
          rawValue !== null
        ) {
          items = fields
            .map((f) => rawValue[f.key])
            .filter((v) => v !== undefined && v !== null && v !== '')
            .map(String);
        }
        sections.push({ type: 'notes', title: sectionLabel, items });
        break;
      }

      default:
        // Unknown section type — skip, do not throw
        break;
    }
  }

  return { meta: { title: data?.['title'] ?? '' }, sections };
}
