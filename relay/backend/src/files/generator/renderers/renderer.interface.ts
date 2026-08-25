// src/files/generator/renderers/renderer.interface.ts
import type { FileFormat } from '../utils/mime.util';

export type RenderInput = {
  format: FileFormat;
  filename: string;
  payload: Record<string, any>;
  meta?: Record<string, any>;
};

export interface IFileRenderer {
  supports(format: FileFormat): boolean;

  render(input: RenderInput): Promise<Buffer>;
}
