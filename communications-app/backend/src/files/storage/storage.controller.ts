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

import { CurrentUser } from '../../infrastructure/security/decorators/current-user.decorator';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
import { RelayTenantContextService } from '../../infrastructure/security/services/relay-tenant-context.service';

import { StorageService } from './services/storage.service';
import { UploadStorageFileDto } from './dto/upload-storage-file.dto';
import { ReplaceStorageFileDto } from './dto/replace-storage-file.dto';

@Controller('files/storage')
export class StorageController {
  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly tenantContext: RelayTenantContextService,
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
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadStorageFileDto,
  ) {
    dto.companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      dto.companyId,
      'relay.use',
    );
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
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ReplaceStorageFileDto,
  ) {
    dto.companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      dto.companyId,
      'relay.use',
    );
    return this.storage.replace(file, dto);
  }

  @Delete()
  @HttpCode(200)
  async remove(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );
    return this.storage.remove(companyId, key);
  }

  @Get('info')
  @HttpCode(200)
  async info(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );
    return this.storage.info(companyId, key);
  }

  @Get('download')
  @HttpCode(200)
  async download(
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
    @Query('expiresInSeconds') expiresInSeconds?: string,
    @Query('fileName') fileName?: string,
  ) {
    companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      companyId,
      'relay.use',
    );

    const expires =
      expiresInSeconds && Number.isFinite(Number(expiresInSeconds))
        ? Number(expiresInSeconds)
        : 60;

    return this.storage.downloadUrl(companyId, key, expires, fileName);
  }

  private async resolveCompanyId(
    ctx: AuthContext,
    apiKey: string,
    requestedCompanyId: string,
    permission: string,
  ): Promise<string> {
    if (ctx.actorType === 'user') {
      return (await this.tenantContext.resolve(ctx, permission)).companyId;
    }
    this.assertApiKey(apiKey);
    return requestedCompanyId;
  }

  private assertApiKey(apiKey: string) {
    const expectedKey = this.config.get<string>('COMMUNICATION_API_KEY');

    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
