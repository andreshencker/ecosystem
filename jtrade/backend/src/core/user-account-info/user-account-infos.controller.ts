import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { Types } from 'mongoose';

import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

import { UserAccountInfoService } from './user-account-infos.service';
import { CreateUserAccountInfoDto } from './dto/create-user-account-info.dto';
import { UpdateUserAccountInfoDto } from './dto/update-user-account-info.dto';
import { UserAccountInfoResponseDto } from './dto/user-account-info-response.dto';
import { UserAccountInfoMapper } from './mappers/user-account-info.mapper';

@Controller('user-account-info')
export class UserAccountInfoController {
  constructor(private readonly service: UserAccountInfoService) {}

  @Roles(UserRole.CLIENT)
  @Get()
  async listMine(@Req() req: any): Promise<UserAccountInfoResponseDto[]> {
    const userId = this.getUserObjectId(req);
    const docs = await this.service.listMine(userId);

    return UserAccountInfoMapper.toResponseList(docs as any[]);
  }

  @Roles(UserRole.CLIENT)
  @Post()
  async createMine(
      @Req() req: any,
      @Body() dto: CreateUserAccountInfoDto,
  ): Promise<UserAccountInfoResponseDto> {
    const userId = this.getUserObjectId(req);
    const created = await this.service.createMine(userId, dto);

    return UserAccountInfoMapper.toResponse(created as any);
  }

  @Roles(UserRole.CLIENT)
  @Get(':id')
  async getById(
      @Req() req: any,
      @Param('id') id: string,
  ): Promise<UserAccountInfoResponseDto> {
    const userId = this.getUserObjectId(req);
    const doc = await this.service.getMineById(userId, id);

    return UserAccountInfoMapper.toResponse(doc as any);
  }

  @Roles(UserRole.CLIENT)
  @Patch(':id')
  async update(
      @Req() req: any,
      @Param('id') id: string,
      @Body() dto: UpdateUserAccountInfoDto,
  ): Promise<UserAccountInfoResponseDto> {
    const userId = this.getUserObjectId(req);
    const updated = await this.service.updateMine(userId, id, dto);

    return UserAccountInfoMapper.toResponse(updated as any);
  }

  @Roles(UserRole.CLIENT)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const userId = this.getUserObjectId(req);

    return this.service.removeMine(userId, id);
  }

  private getUserObjectId(req: any): Types.ObjectId {
    const raw = req?.user?.id ?? req?.user?.sub;

    if (!raw || !Types.ObjectId.isValid(String(raw))) {
      throw new BadRequestException('Invalid user id in token');
    }

    return new Types.ObjectId(String(raw));
  }
}