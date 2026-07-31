// Converts a stored PDF format contract into a ReportPayload that contains only
// neutral structural placeholders.  No runtime business data is read or required.
// The resulting payload is fed to ReportContentBuilder.build() so that the real
// company layout, theme and typography are applied to show document structure.

import type {
  ReportPayload,
  ReportSection,
} from '../../../files/reports/types/report-payload.types';

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Builds a ReportPayload from a PdfFormatContract using structural placeholders.
 *
 * Rules:
 *  - Only sections with enabled !== false are included.
 *  - Field labels from the stored contract become KPI card labels / table headers.
 *  - All values are "—" (neutral dash) — no business data is introduced.
 *  - One placeholder row is generated for table sections.
 *  - notes sections render field labels as bullet items when defined.
 */
export function buildPdfStructurePlaceholder(
  contract: Record<string, any>,
  displayName?: string,
): ReportPayload {
  const sections: ReportSection[] = [];

  for (const section of Array.isArray(contract?.sections)
    ? contract.sections
    : []) {
    if (section.enabled === false) continue;

    const sectionLabel = String(section.label || section.key || 'Section');
    const fields: any[] = Array.isArray(section.fields) ? section.fields : [];
    const columns: any[] = Array.isArray(section.columns)
      ? section.columns
      : [];

    switch (section.type) {
      case 'html': {
        if (fields.length > 0) {
          const rows = fields
            .map((f: any) => {
              const label = String(f.label || f.key || '');
              return (
                `<tr>` +
                `<td style="font-weight:600;padding:4px 8px 4px 0;width:42%;font-size:11px;color:#555">${esc(label)}</td>` +
                `<td style="padding:4px 0;font-size:11px;color:#999">—</td>` +
                `</tr>`
              );
            })
            .join('');
          sections.push({
            type: 'html',
            html:
              `<div style="font-size:10px;font-weight:700;text-transform:uppercase;` +
              `letter-spacing:.6px;color:#888;margin-bottom:6px">${esc(sectionLabel)}</div>` +
              `<table style="width:100%;border-collapse:collapse">${rows}</table>`,
          });
        } else {
          sections.push({
            type: 'html',
            html:
              `<div style="padding:10px 12px;border:1px dashed #ccc;border-radius:6px;` +
              `font-size:11px;color:#aaa;text-align:center">[${esc(sectionLabel)}]</div>`,
          });
        }
        break;
      }

      case 'summary': {
        const cards =
          fields.length > 0
            ? fields.map((f: any) => ({
                label: String(f.label || f.key || ''),
                value: '—',
              }))
            : [{ label: sectionLabel, value: '—' }];
        sections.push({ type: 'summary', title: sectionLabel, cards });
        break;
      }

      case 'table': {
        if (columns.length === 0) break;
        const mappedColumns = columns.map((c: any) => ({
          key: String(c.key || ''),
          label: String(c.label || c.key || ''),
        }));
        const placeholderRow: Record<string, string> = {};
        for (const c of mappedColumns) placeholderRow[c.key] = '—';
        sections.push({
          type: 'table',
          title: sectionLabel,
          columns: mappedColumns,
          rows: [placeholderRow],
        });
        break;
      }

      case 'totals': {
        if (fields.length === 0) break;
        const items = fields.map((f: any) => {
          const label = String(f.label || f.key || '');
          // Auto-detect emphasis: currency fields whose key contains "total" get strong style.
          const autoEmphasis =
            (f.type === 'currency' || f.format === 'currency') &&
            /total/i.test(String(f.key))
              ? ('strong' as const)
              : undefined;
          return { label, value: '—', emphasis: autoEmphasis };
        });
        sections.push({ type: 'totals', title: sectionLabel, items });
        break;
      }

      case 'notes': {
        const items =
          fields.length > 0
            ? fields.map((f: any) => `[${String(f.label || f.key || '')}]`)
            : [`[${sectionLabel}]`];
        sections.push({ type: 'notes', title: sectionLabel, items });
        break;
      }

      default:
        break;
    }
  }

  const title = displayName
    ? `${displayName} — Structure Preview`
    : 'Document Structure Preview';

  return { meta: { title }, sections };
}
