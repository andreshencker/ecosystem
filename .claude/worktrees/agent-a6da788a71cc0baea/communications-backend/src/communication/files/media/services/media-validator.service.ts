import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MediaValidatorService {
  private readonly maxBytes: number;

  constructor(private readonly config: ConfigService) {
    const maxMb = Number(
      this.config.get<string>('MEDIA_MAX_MB') ??
        process.env.MEDIA_MAX_MB ??
        '5',
    );
    this.maxBytes = Math.max(1, maxMb) * 1024 * 1024;
  }

  validateFile(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException(
        `Only image/* is allowed. Got: ${file.mimetype}`,
      );
    }

    if (file.size > this.maxBytes) {
      throw new BadRequestException(
        `File too large. Max ${this.maxBytes} bytes`,
      );
    }
  }

  detectExtFromMime(mime: string): string {
    const m = (mime ?? '').toLowerCase();

    if (m === 'image/png') return 'png';
    if (m === 'image/jpeg') return 'jpg';
    if (m === 'image/webp') return 'webp';
    if (m === 'image/gif') return 'gif';
    if (m === 'image/svg+xml') return 'svg';

    // fallback
    return 'png';
  }

  detectContentType(file: Express.Multer.File): string {
    return file.mimetype || 'application/octet-stream';
  }
}
