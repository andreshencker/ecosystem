// src/files/generator/utils/columns.util.ts
export type ColumnInput = string | { key: string; label?: string };

export type NormalizedColumn = {
  key: string;
  label: string;
};

const humanize = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

export function normalizeColumns(input: any): NormalizedColumn[] {
  const cols = Array.isArray(input) ? input : [];

  return cols
    .map((c: ColumnInput) => {
      if (typeof c === 'string') return { key: c, label: humanize(c) };

      if (c && typeof c === 'object' && typeof (c as any).key === 'string') {
        const key = (c as any).key;
        const label =
          typeof (c as any).label === 'string' && (c as any).label.trim()
            ? (c as any).label.trim()
            : humanize(key);
        return { key, label };
      }
      return null;
    })
    .filter(Boolean) as NormalizedColumn[];
}
