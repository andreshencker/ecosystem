// src/files/reports/builders/report-content.builder.ts
import { Injectable } from '@nestjs/common';
import { normalizeColumns } from '../../generator/utils/columns.util';
import type { ReportPayload } from '../types/report-payload.types';

function esc(v: any) {
  const s = v === null || v === undefined ? '' : String(v);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

@Injectable()
export class ReportContentBuilder {
  build(report: ReportPayload, data: Record<string, any> = {}): string {
    const meta = report?.meta ?? {};
    const sections = Array.isArray(report?.sections) ? report.sections : [];

    // helper: resolver {{data.xxx}}
    const resolveData = (s: string) =>
      s.replace(/\{\{data\.([a-zA-Z0-9_.-]+)\}\}/g, (_, path) => {
        const parts = String(path).split('.');
        let cur: any = data;
        for (const p of parts) cur = cur?.[p];
        return esc(cur ?? '');
      });

    let html = `
      <style>
        /* ===== Base (simple, limpio) ===== */
        :root{
          --r-text: rgba(17,24,39,0.92);
          --r-muted: rgba(17,24,39,0.62);
          --r-border: rgba(17,24,39,0.10);
          --r-soft: rgba(17,24,39,0.04);
          --r-soft2: rgba(17,24,39,0.06);
          --r-radius: 12px;
        }

        .r-title{ margin: 0 0 4px 0; font-size: 18px; font-weight: 900; color: var(--r-text); }
        .r-subtitle{ margin: 0 0 14px 0; font-size: 11px; color: var(--r-muted); }

        .r-block{ margin: 14px 0; }
        .r-h2{ margin: 0 0 10px 0; font-size: 12px; font-weight: 900; color: var(--r-text); }

        /* ===== SUMMARY: tarjetas pequeñas en una sola línea ===== */
        .r-summary-row{
          display: flex;
          flex-wrap: nowrap;         /* una sola línea */
          gap: 10px;
          width: 100%;
        }

        .r-kpi{
          flex: 1 1 0;
          min-width: 0;              /* para que no rompa layout */
          border: 1px solid var(--r-border);
          border-radius: var(--r-radius);
          background: rgba(255,255,255,0.85);
          padding: 10px 12px;
        }

        .r-kpi-label{
          font-size: 10px;
          color: var(--r-muted);
          margin: 0 0 6px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .r-kpi-value{
          font-size: 14px;
          font-weight: 950;
          color: var(--r-text);
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .r-kpi-hint{
          margin-top: 6px;
          font-size: 10px;
          color: var(--r-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Si tienes muchos KPIs y NO caben, se van a comprimir.
           Si prefieres que se “vayan” a la siguiente línea, cambia nowrap -> wrap. */

        /* ===== NOTES (igual simple) ===== */
        .r-ul{ margin: 0; padding-left: 18px; }
        .r-li{ margin: 0 0 6px 0; color: rgba(17,24,39,0.86); }

        /* ===== TABLE (como estaba, simple y legible) ===== */
        .r-table{ width: 100%; border-collapse: collapse; font-size: 11px; }
        .r-th,.r-td{ border: 1px solid rgba(17,24,39,.12); padding: 8px; vertical-align: top; }
        .r-th{ background: rgba(17,24,39,.05); font-weight: 900; text-align: left; }
        .r-tr-alt{ background: rgba(17,24,39,.02); }
        .r-tr-subtotal{ background: rgba(240,185,11,.08); font-weight: 900; }
        .r-tr-total{ background: rgba(240,185,11,.16); font-weight: 950; }

        /* ===== TOTALS (invoice style) ===== */
        /* ✅ IMPORTANT: no se parte entre páginas */
        .r-avoid-break{
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .r-totals-wrap{
          margin-top: 12px;
        }

        .r-totals{
          border: 1px solid rgba(17,24,39,0.12);
          border-radius: 12px;
          background: rgba(255,255,255,0.90);
          padding: 12px 14px;
          width: 100%;
          max-width: 320px;      /* estilo invoice: bloque a la derecha */
          margin-left: auto;     /* lo empuja a la derecha */
        }

        .r-t-row{
          display:flex;
          justify-content: space-between;
          gap: 12px;
          padding: 7px 0;
        }

        .r-t-row + .r-t-row{
          border-top: 1px dashed rgba(17,24,39,0.14);
        }

        .r-t-label{
          font-size: 10px;
          color: rgba(17,24,39,0.62);
        }

        .r-t-value{
          font-size: 12px;
          font-weight: 900;
          color: rgba(17,24,39,0.92);
          text-align: right;
          white-space: nowrap;
        }

        .r-t-strong{
          font-size: 13px;
          font-weight: 950;
        }

        /* Opcional: separador visual */
        .r-divider{
          height: 1px;
          background: rgba(17,24,39,0.10);
          margin: 14px 0;
        }
      </style>
    `;

    if (meta.title) html += `<h1 class="r-title">${esc(meta.title)}</h1>`;
    if (meta.subtitle)
      html += `<p class="r-subtitle">${esc(meta.subtitle)}</p>`;

    for (const section of sections) {
      if (!section || typeof section !== 'object') continue;

      // 1) HTML RAW
      if ((section as any).type === 'html') {
        const raw = String((section as any).html ?? '');
        html += `<div class="r-block">${resolveData(raw)}</div>`;
      }

      // 2) SUMMARY (KPIs en una sola línea)
      if ((section as any).type === 'summary') {
        const title = (section as any).title
          ? esc((section as any).title)
          : 'Summary';
        const cards = Array.isArray((section as any).cards)
          ? (section as any).cards
          : [];

        html += `<div class="r-block">`;
        html += `<div class="r-h2">${title}</div>`;
        html += `<div class="r-summary-row">`;

        for (const c of cards) {
          const label = esc(c?.label ?? '');
          const value = esc(c?.value ?? '');
          const hint = c?.hint ? esc(c.hint) : '';

          html += `
            <div class="r-kpi">
              <div class="r-kpi-label">${label}</div>
              <div class="r-kpi-value">${value}</div>
              ${hint ? `<div class="r-kpi-hint">${hint}</div>` : ''}
            </div>
          `;
        }

        html += `</div></div>`;
      }

      // 3) NOTES (como estaba)
      if ((section as any).type === 'notes') {
        const title = (section as any).title
          ? esc((section as any).title)
          : 'Notes';
        const items = Array.isArray((section as any).items)
          ? (section as any).items
          : [];

        html += `<div class="r-block"><div class="r-h2">${title}</div><ul class="r-ul">`;
        for (const n of items) html += `<li class="r-li">${esc(n)}</li>`;
        html += `</ul></div>`;
      }

      // 4) TABLE (como estaba)
      if ((section as any).type === 'table') {
        const title = (section as any).title ? esc((section as any).title) : '';
        const columns = normalizeColumns((section as any).columns);
        const rows = Array.isArray((section as any).rows)
          ? (section as any).rows
          : [];

        html += `<div class="r-block">`;
        if (title) html += `<div class="r-h2">${title}</div>`;

        html += `<table class="r-table"><thead><tr>`;
        for (const col of columns)
          html += `<th class="r-th">${esc(col.label)}</th>`;
        html += `</tr></thead><tbody>`;

        rows.forEach((row: any, idx: number) => {
          const kind =
            row?.__kind === 'subtotal' || row?.__kind === 'total'
              ? row.__kind
              : null;

          const trClass = kind
            ? kind === 'total'
              ? 'r-tr-total'
              : 'r-tr-subtotal'
            : idx % 2 === 0
              ? 'r-tr-alt'
              : '';

          html += `<tr class="${trClass}">`;

          if (Array.isArray(row)) {
            for (const cell of row)
              html += `<td class="r-td">${esc(cell)}</td>`;
          } else {
            columns.forEach((c, colIdx) => {
              if (kind && colIdx === 0) {
                html += `<td class="r-td">${esc(row?.label ?? (kind === 'total' ? 'Total' : 'Subtotal'))}</td>`;
              } else {
                html += `<td class="r-td">${esc(row?.[c.key] ?? '')}</td>`;
              }
            });
          }

          html += `</tr>`;
        });

        html += `</tbody></table></div>`;
      }

      // 5) TOTALS (invoice style, abajo de la tabla, sin partirse)
      if ((section as any).type === 'totals') {
        const title = (section as any).title
          ? esc((section as any).title)
          : 'Totals';
        const items = Array.isArray((section as any).items)
          ? (section as any).items
          : [];

        html += `
          <div class="r-block r-totals-wrap r-avoid-break">
            <div class="r-h2">${title}</div>
            <div class="r-totals">
        `;

        for (const it of items) {
          const strong = it?.emphasis === 'strong';
          html += `
            <div class="r-t-row">
              <div class="r-t-label">${esc(it?.label ?? '')}</div>
              <div class="r-t-value ${strong ? 'r-t-strong' : ''}">${esc(it?.value ?? '')}</div>
            </div>
          `;
        }

        html += `</div></div>`;
      }
    }

    return html;
  }
}
