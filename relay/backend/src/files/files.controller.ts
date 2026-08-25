// src/files/files.controller.ts
import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import { GeneratorService } from './generator/generator.service';
import { GenerateFileDto } from './generator/dto/generate-file.dto';

@Controller('files')
export class FilesController {
  constructor(private readonly generator: GeneratorService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateFileDto, @Res() res: Response) {
    const file = await this.generator.handle(dto);

    // mime por formato (si ya lo manejas en otro lado, ok)
    const mime =
      dto.format === 'pdf'
        ? 'application/pdf'
        : dto.format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv; charset=utf-8';

    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${dto.filename}"`,
    );
    return res.send(file.buffer);
  }
}
