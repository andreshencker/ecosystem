import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RelayStorageService } from '../../integrations/relay/relay-storage.service';
import { Platform, PlatformDocument } from './schemas/platform.schema';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { PlatformResponseDto } from './dto/platform-response.dto';
import { PlatformMapper } from './mappers/platform.mapper';

@Injectable()
export class PlatformsService {
  constructor(
    @InjectModel(Platform.name) private readonly model: Model<PlatformDocument>,
    private readonly relayStorage: RelayStorageService,
  ) {}

  async findAll(params: { active?: boolean } = {}): Promise<PlatformResponseDto[]> {
    const filter: any = {};
    if (typeof params.active === 'boolean') filter.isActive = params.active;

    const list = await this.model.find(filter).sort({ name: 1 }).lean();
    return PlatformMapper.toResponseList(list);
  }

  async findById(id: string): Promise<PlatformResponseDto> {
    const doc = await this.model.findById(this.objectId(id)).lean();
    if (!doc) throw new HttpException('Platform not found', HttpStatus.NOT_FOUND);
    return PlatformMapper.toResponse(doc);
  }

  async create(dto: CreatePlatformDto): Promise<PlatformResponseDto> {
    const key = this.normalizeKey(dto.key);
    if (!key) throw new HttpException('key is required', HttpStatus.BAD_REQUEST);

    try {
      const created = await this.model.create({
        key,
        name: dto.name.trim(),
        description: (dto.description ?? '').trim(),
        logoUrl: dto.logoUrl ?? '',
        isActive: dto.isActive ?? true,
        isSupported: dto.isSupported ?? false,
      });
      return PlatformMapper.toResponse(created.toObject());
    } catch (err: any) {
      if (err?.code === 11000) throw new HttpException('Platform key already exists', HttpStatus.BAD_REQUEST);
      throw new HttpException(err?.message ?? 'Failed to create platform', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(id: string, dto: UpdatePlatformDto): Promise<PlatformResponseDto> {
    const _id = this.objectId(id);
    const $set: any = {};

    if (dto.key !== undefined) $set.key = this.normalizeKey(dto.key);
    if (dto.name !== undefined) $set.name = dto.name.trim();
    if (dto.description !== undefined) $set.description = (dto.description ?? '').trim();
    if (dto.logoUrl !== undefined) $set.logoUrl = dto.logoUrl;
    if (dto.isActive !== undefined) $set.isActive = dto.isActive;
    if (dto.isSupported !== undefined) $set.isSupported = dto.isSupported;

    try {
      const updated = await this.model.findByIdAndUpdate(_id, { $set }, { new: true, runValidators: true });
      if (!updated) throw new HttpException('Platform not found', HttpStatus.NOT_FOUND);
      return PlatformMapper.toResponse(updated.toObject());
    } catch (err: any) {
      if (err?.code === 11000) throw new HttpException('Platform key already exists', HttpStatus.BAD_REQUEST);
      if (err instanceof HttpException) throw err;
      throw new HttpException(err?.message ?? 'Failed to update platform', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.objectId(id);
    const deleted = await this.model.findByIdAndDelete(_id);
    if (!deleted) throw new HttpException('Platform not found', HttpStatus.NOT_FOUND);
    return { deleted: true };
  }

  async uploadLogo(id: string, file: Express.Multer.File): Promise<PlatformResponseDto> {
    const url = await this.relayStorage.uploadLogo(file);
    return this.update(id, { logoUrl: url });
  }

  private objectId(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new HttpException('Invalid id', HttpStatus.BAD_REQUEST);
    return new Types.ObjectId(id);
  }

  private normalizeKey(v: string) {
    return String(v ?? '').toLowerCase().trim();
  }
}
