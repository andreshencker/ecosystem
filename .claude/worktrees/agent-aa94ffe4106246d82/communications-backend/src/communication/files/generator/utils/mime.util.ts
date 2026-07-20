// src/files/generator/utils/mime.util.ts
export const FILE_FORMATS = ['pdf', 'xlsx', 'csv'] as const;
export type FileFormat = (typeof FILE_FORMATS)[number];

export function resolveMimeType(format: FileFormat): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}
