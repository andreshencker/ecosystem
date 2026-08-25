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

import { MediaService } from './services/media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { ReplaceMediaDto } from './dto/replace-media.dto';

@Controller('files/media')
export class MediaController {
  constructor(
    private readonly config: ConfigService,
    private readonly media: MediaService,
    private readonly tenantContext: RelayTenantContextService,
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
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
  ) {
    dto.companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      dto.companyId,
      'relay.use',
    );
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
    @CurrentUser() ctx: AuthContext,
    @Headers('x-api-key') apiKey: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ReplaceMediaDto,
  ) {
    dto.companyId = await this.resolveCompanyId(
      ctx,
      apiKey,
      dto.companyId,
      'relay.use',
    );
    return this.media.replace(file, dto);
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
    return this.media.remove(companyId, key);
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
    return this.media.info(companyId, key);
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
    const expectedKey = this.config.get<string>('RELAY_API_KEY');
    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
