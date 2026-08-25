import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageFileRules } from '../types/storage-file-rules.type';
import { StorageKeyService } from './storage-key.service';

@Injectable()
export class StorageValidatorService {
  private readonly defaultMaxBytes: number;

  constructor(
    private readonly config: ConfigService,
    private readonly keys: StorageKeyService,
  ) {
    const maxMb = Number(
      this.config.get<string>('FILES_MAX_MB') ??
        process.env.FILES_MAX_MB ??
        '20',
    );
    this.defaultMaxBytes = Math.max(1, maxMb) * 1024 * 1024;
  }

  validateFile(file?: Express.Multer.File, rules?: StorageFileRules) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const maxBytes = rules?.maxBytes ?? this.defaultMaxBytes;
    if (file.size > maxBytes) {
      throw new BadRequestException(`File too large. Max ${maxBytes} bytes`);
    }

    const ext = this.detectExtension(file);
    const mime = this.detectContentType(file);

    if (rules?.allowedExtensions?.length) {
      const allowed = rules.allowedExtensions.map((x) =>
        x.toLowerCase().trim(),
      );

      if (!ext || !allowed.includes(ext)) {
        throw new BadRequestException(
          `Invalid extension. Allowed: ${allowed.join(', ')}`,
        );
      }
    }

    if (rules?.allowedMimeTypes?.length) {
      const allowed = rules.allowedMimeTypes.map((x) => x.toLowerCase().trim());

      if (!allowed.includes(mime.toLowerCase())) {
        throw new BadRequestException(
          `Invalid mime type. Allowed: ${allowed.join(', ')}`,
        );
      }
    }
  }

  validateFolder(folder: string) {
    const clean = this.keys.cleanFolder(folder);
    if (!clean) {
      throw new BadRequestException('folder is required');
    }
  }

  validateFileName(fileName: string) {
    const clean = this.keys.cleanFileName(fileName);
    if (!clean) {
      throw new BadRequestException('fileName is required');
    }
  }

  detectContentType(file: Express.Multer.File): string {
    return file.mimetype || 'application/octet-stream';
  }

  detectExtension(file: Express.Multer.File): string | undefined {
    return this.keys.getExtensionFromFileName(file.originalname);
  }
}
