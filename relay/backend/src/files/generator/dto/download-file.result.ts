// src/files/generator/dto/download-file.result.ts
import type { FileFormat } from '../utils/mime.util';

export type DownloadFileResult = {
  format: FileFormat;
  filename: string;
  buffer: Buffer;
  mimeType: string;
};
