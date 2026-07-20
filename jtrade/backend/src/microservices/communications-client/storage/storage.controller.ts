import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole } from '../../../core/users/schemas/user.schema';

import { StorageCommunicationsClient } from './storage-client';
import type { HttpResult } from '../communications-http.client';

@Controller('communications/files/storage')
export class StorageController {
  constructor(private readonly client: StorageCommunicationsClient) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: any,
  ) {
    const authHeader = req.headers.authorization;
    const res = await this.client.upload(file, dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Put()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async replace(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: any,
  ) {
    const authHeader = req.headers.authorization;
    const res = await this.client.replace(file, dto, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Delete()
  async remove(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
  ) {
    const authHeader = req.headers.authorization;
    const res = await this.client.remove({ companyId, key }, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Get('info')
  async info(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
  ) {
    const authHeader = req.headers.authorization;
    const res = await this.client.info({ companyId, key }, authHeader);
    return this.unwrapOrThrow(res);
  }

  @Roles(UserRole.ADMIN)
  @Get('download')
  async download(
    @Req() req: Request,
    @Query('companyId') companyId: string,
    @Query('key') key: string,
    @Query('expiresInSeconds') expiresInSeconds?: string,
    @Query('fileName') fileName?: string,
  ) {
    const authHeader = req.headers.authorization;
    const parsedExpires =
      expiresInSeconds && Number.isFinite(Number(expiresInSeconds))
        ? Number(expiresInSeconds)
        : undefined;

    const res = await this.client.download(
      {
        companyId,
        key,
        expiresInSeconds: parsedExpires,
        fileName,
      },
      authHeader,
    );

    return this.unwrapOrThrow(res);
  }

  private unwrapOrThrow<T>(res: HttpResult<T>): T {
    if (res.ok) return res.data as T;
    throw new HttpException(res.message ?? 'Upstream error', res.status || 502);
  }
}
