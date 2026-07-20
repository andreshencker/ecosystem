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
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';

import { StorageService } from './services/storage.service';
import { UploadStorageFileDto } from './dto/upload-storage-file.dto';
import { ReplaceStorageFileDto } from './dto/replace-storage-file.dto';

@Controller('files/storage')
export class StorageController {
  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
  ) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(
    @Headers('x-api-key') apiKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadStorageFileDto,
  ) {
    this.assertApiKey(apiKey);
    return this.storage.upload(file, dto);
  }

  @Put()
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async replace(
    @Headers('x-api-key') apiKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ReplaceStorageFileDto,
  ) {
    this.assertApiKey(apiKey);
    return this.storage.replace(file, dto);
  }

  @Delete()
  @HttpCode(200)
  async remove(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
  ) {
    this.assertApiKey(apiKey);
    return this.storage.remove(companyId, key);
  }

  @Get('info')
  @HttpCode(200)
  async info(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
  ) {
    this.assertApiKey(apiKey);
    return this.storage.info(companyId, key);
  }

  @Get('download')
  @HttpCode(200)
  async download(
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
    @Query('expiresInSeconds') expiresInSeconds?: string,
    @Query('fileName') fileName?: string,
  ) {
    this.assertApiKey(apiKey);

    const expires =
      expiresInSeconds && Number.isFinite(Number(expiresInSeconds))
        ? Number(expiresInSeconds)
        : 60;

    return this.storage.downloadUrl(companyId, key, expires, fileName);
  }

  private assertApiKey(apiKey: string) {
    const expectedKey = this.config.get<string>('COMMUNICATION_API_KEY');

    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
