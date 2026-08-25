// src/channels/channels-catalogue/channels-catalogue.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Channel, ChannelDocument } from './schemas/channel-catalog.schema';
import { CreateChannelDto } from './dto/create-channel-catalog.dto';
import { UpdateChannelDto } from './dto/update-channel-catalog.dto';
import { ChannelResponseDto } from './dto/channel-catalog-response.dto';
import { ChannelMapper } from './mappers/channel.mapper';
import type { PaginatedResponse } from '../../common/pagination/pagination.util';

@Injectable()
export class ChannelsCatalogService {
  constructor(
    @InjectModel(Channel.name)
    private readonly model: Model<ChannelDocument>,
  ) {}

  async findAll(params?: {
    active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<ChannelResponseDto>> {
    const filter: any = {};
    if (typeof params?.active === 'boolean') filter.isActive = params.active;

    const limit = Math.min(Number(params?.limit ?? 50), 200);
    const offset = Math.max(0, Number(params?.offset ?? 0));

    const [list, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ channelKey: 1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      this.model.countDocuments(filter),
    ]);

    return {
      data: ChannelMapper.toResponseList(list as any[]),
      total,
      limit,
      offset,
    };
  }

  async findByKey(channelKey: string): Promise<ChannelResponseDto> {
    const key = String(channelKey ?? '')
      .toLowerCase()
      .trim();
    const doc = await this.model.findOne({ channelKey: key }).lean();

    if (!doc)
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    return ChannelMapper.toResponse(doc as any);
  }

  async create(dto: CreateChannelDto): Promise<ChannelResponseDto> {
    try {
      const payload: Partial<Channel> = {
        channelKey: dto.channelKey.toLowerCase().trim(),
        displayName: dto.displayName.trim(),
        description: dto.description?.trim() ?? '',
        contentFormat: dto.contentFormat,
        supportsTemplates: dto.supportsTemplates ?? false,
        supportsFiles: dto.supportsFiles ?? false,
        isActive: dto.isActive ?? true,
      };

      const created = await this.model.create(payload);
      return ChannelMapper.toResponse(created.toObject() as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'channelKey already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        err?.message ?? 'Failed to create channel',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateByKey(
    channelKey: string,
    dto: UpdateChannelDto,
  ): Promise<ChannelResponseDto> {
    try {
      const key = String(channelKey ?? '')
        .toLowerCase()
        .trim();

      const $set: any = { ...dto };

      if ($set.channelKey !== undefined)
        $set.channelKey = String($set.channelKey).toLowerCase().trim();
      if ($set.displayName !== undefined)
        $set.displayName = String($set.displayName).trim();
      if ($set.description !== undefined)
        $set.description = String($set.description ?? '').trim();

      const doc = await this.model.findOneAndUpdate(
        { channelKey: key },
        { $set },
        { new: true, runValidators: true },
      );

      if (!doc)
        throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);

      return ChannelMapper.toResponse(doc.toObject() as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'channelKey already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? 'Failed to update channel',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async removeByKey(channelKey: string): Promise<{ deleted: boolean }> {
    const key = String(channelKey ?? '')
      .toLowerCase()
      .trim();
    const res = await this.model.findOneAndDelete({ channelKey: key });
    if (!res)
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    return { deleted: true };
  }
}
