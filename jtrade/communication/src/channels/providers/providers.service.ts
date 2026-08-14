import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Provider, ProviderDocument } from './schemas/provider.schema';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { ProviderMapper } from './mappers/provider.mapper';

// ✅ modelo real del catálogo de canales
import {
  Channel,
  ChannelDocument,
} from '../channels-catalogue/schemas/channel-catalog.schema';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectModel(Provider.name)
    private readonly model: Model<ProviderDocument>,
    @InjectModel(Channel.name)
    private readonly channelsModel: Model<ChannelDocument>,
  ) {}

  async findAll(params?: {
    active?: boolean;
    channelId?: string;
    populate?: boolean;
  }): Promise<ProviderResponseDto[]> {
    const filter: any = {};

    if (typeof params?.active === 'boolean') filter.isActive = params.active;

    if (params?.channelId) {
      if (!Types.ObjectId.isValid(params.channelId)) {
        throw new HttpException('Invalid channelId', HttpStatus.BAD_REQUEST);
      }
      filter.channelId = new Types.ObjectId(params.channelId);
    }

    const q = this.model.find(filter).sort({ providerKey: 1 });

    if (params?.populate) q.populate('channelId');

    const list = await q.lean();
    return ProviderMapper.toResponseList(list as any[]);
  }

  async findById(id: string, populate = true): Promise<ProviderResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid id', HttpStatus.BAD_REQUEST);
    }

    const q = this.model.findById(new Types.ObjectId(id));
    if (populate) q.populate('channelId');

    const doc = await q.lean();
    if (!doc)
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);

    return ProviderMapper.toResponse(doc as any);
  }

  async create(dto: CreateProviderDto): Promise<ProviderResponseDto> {
    try {
      const providerKey = this.normalizeKey(dto.providerKey);
      const displayName = (dto.displayName ?? '').trim();

      await this.assertChannelExists(dto.channelId);

      const created = await this.model.create({
        providerKey,
        displayName,
        channelId: new Types.ObjectId(dto.channelId),
        connectionType: dto.connectionType,
        isActive: dto.isActive ?? true,
      });

      const populated = await this.model
        .findById(created._id)
        .populate('channelId')
        .lean();

      return ProviderMapper.toResponse(populated as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'providerKey already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? 'Failed to create provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    dto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException('Invalid id', HttpStatus.BAD_REQUEST);
      }
      const _id = new Types.ObjectId(id);

      const $set: any = {};

      if (dto.providerKey !== undefined)
        $set.providerKey = this.normalizeKey(dto.providerKey);
      if (dto.displayName !== undefined)
        $set.displayName = String(dto.displayName ?? '').trim();
      if (dto.connectionType !== undefined)
        $set.connectionType = dto.connectionType;
      if (dto.isActive !== undefined) $set.isActive = dto.isActive;

      if (dto.channelId !== undefined) {
        await this.assertChannelExists(dto.channelId);
        $set.channelId = new Types.ObjectId(dto.channelId);
      }

      const updated = await this.model
        .findByIdAndUpdate(_id, { $set }, { new: true, runValidators: true })
        .populate('channelId')
        .lean();

      if (!updated)
        throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);

      return ProviderMapper.toResponse(updated as any);
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new HttpException(
          'providerKey already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err?.message ?? 'Failed to update provider',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException('Invalid id', HttpStatus.BAD_REQUEST);
    }

    const res = await this.model.findByIdAndDelete(new Types.ObjectId(id));
    if (!res)
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);

    return { deleted: true };
  }

  private normalizeKey(key: string) {
    return (key ?? '').toLowerCase().trim();
  }

  private async assertChannelExists(channelId: string) {
    if (!Types.ObjectId.isValid(channelId)) {
      throw new HttpException('Invalid channelId', HttpStatus.BAD_REQUEST);
    }

    const exists = await this.channelsModel.exists({
      _id: new Types.ObjectId(channelId),
      isActive: true,
    });

    if (!exists) {
      throw new HttpException(
        'Channel not found or inactive',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
