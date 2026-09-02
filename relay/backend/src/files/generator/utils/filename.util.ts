// src/files/generator/utils/filename.util.ts
import type { FileFormat } from './mime.util';

export function ensureFileExtension(
  filename: string,
  format: FileFormat,
): string {
  const ext = `.${format}`;
  if (!filename) return `file${ext}`;
  return filename.toLowerCase().endsWith(ext) ? filename : `${filename}${ext}`;
}
