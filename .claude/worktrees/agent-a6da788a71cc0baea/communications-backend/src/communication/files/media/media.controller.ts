import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/modules-express';
import { ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';

import { MediaService } from './services/media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { ReplaceMediaDto } from './dto/replace-media.dto';

@Controller('files/media')
export class MediaController {
  constructor(
    private readonly config: ConfigService,
    private readonly media: MediaService,
  ) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async upload(
    @Headers('x-api-key') apiKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
  ) {
    this.assertApiKey(apiKey);
    return this.media.upload(file, dto);
  }

  @Put()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async replace(
    @Headers('x-api-key') apiKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ReplaceMediaDto,
  ) {
    this.assertApiKey(apiKey);
    return this.media.replace(file, dto);
  }

  @Delete()
  @HttpCode(200)
  async remove(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
  ) {
    this.assertApiKey(apiKey);
    return this.media.remove(companyId, key);
  }

  @Get('info')
  @HttpCode(200)
  async info(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
  ) {
    this.assertApiKey(apiKey);
    return this.media.info(companyId, key);
  }

  private assertApiKey(apiKey: string) {
    const expectedKey = this.config.get<string>('COMMUNICATION_API_KEY');
    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
