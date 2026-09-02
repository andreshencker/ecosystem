import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { AuthContext } from '../auth/types/auth-context';
import { CreateSymbolDto } from './dto/create-symbol.dto';
import { UpdateSymbolDto } from './dto/update-symbol.dto';
import { SymbolResponseDto } from './dto/symbol-response.dto';
import { SymbolMapper } from './mappers/symbol.mapper';
import { Symbol, SymbolDocument } from './schemas/symbol.schema';

@Injectable()
export class SymbolsService {
  constructor(
    @InjectModel(Symbol.name)
    private readonly symbols: Model<SymbolDocument>,
  ) {}

  private objectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid symbol id');
    return new Types.ObjectId(id);
  }

  private normalize(symbol: string): string {
    return symbol.trim().toUpperCase();
  }

  private normalizeAliases(aliases?: string[]): string[] {
    if (!aliases) return [];
    return [...new Set(aliases.map((a) => this.normalize(a)).filter(Boolean))];
  }

  async create(ctx: AuthContext, dto: CreateSymbolDto): Promise<SymbolResponseDto> {
    const symbol = this.normalize(dto.symbol);
    if (!symbol) throw new BadRequestException('Symbol is required');
    try {
      const doc = await this.symbols.create({
        providerOrganizationId: ctx.organizationId,
        createdByGrapiflyUserId: ctx.grapiflyUserId,
        symbol,
        aliases: this.normalizeAliases(dto.aliases),
        isActive: dto.isActive ?? true,
      });
      return SymbolMapper.toResponse(doc);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(`${symbol} already exists in your organization`);
      }
      throw error;
    }
  }

  async bulkCreate(ctx: AuthContext, symbols: string[]): Promise<{ created: number; skipped: number; symbols: SymbolResponseDto[] }> {
    const unique = [...new Set(symbols.map((s) => this.normalize(s)).filter(Boolean))];
    if (unique.length === 0) throw new BadRequestException('No valid symbols provided');

    const ops = unique.map((symbol) => ({
      updateOne: {
        filter: { providerOrganizationId: ctx.organizationId, symbol },
        update: {
          $setOnInsert: {
            providerOrganizationId: ctx.organizationId,
            createdByGrapiflyUserId: ctx.grapiflyUserId,
            symbol,
            aliases: [],
            isActive: true,
          },
        },
        upsert: true,
      },
    }));
    const result = await this.symbols.bulkWrite(ops, { ordered: false });
    const created = result.upsertedCount ?? 0;

    const list = await this.symbols
      .find({ providerOrganizationId: ctx.organizationId, symbol: { $in: unique } })
      .sort({ symbol: 1 })
      .lean();
    return { created, skipped: unique.length - created, symbols: SymbolMapper.toResponseList(list) };
  }

  async listMine(ctx: AuthContext): Promise<SymbolResponseDto[]> {
    const list = await this.symbols
      .find({ providerOrganizationId: ctx.organizationId })
      .sort({ symbol: 1 })
      .lean();
    return SymbolMapper.toResponseList(list);
  }

  async findMine(ctx: AuthContext, id: string): Promise<SymbolResponseDto> {
    const doc = await this.symbols
      .findOne({ _id: this.objectId(id), providerOrganizationId: ctx.organizationId })
      .lean();
    if (!doc) throw new NotFoundException('Symbol not found');
    return SymbolMapper.toResponse(doc);
  }

  async update(ctx: AuthContext, id: string, dto: UpdateSymbolDto): Promise<SymbolResponseDto> {
    const patch: Record<string, unknown> = {};
    if (dto.symbol !== undefined) {
      const symbol = this.normalize(dto.symbol);
      if (!symbol) throw new BadRequestException('Symbol cannot be empty');
      patch.symbol = symbol;
    }
    if (dto.aliases !== undefined) patch.aliases = this.normalizeAliases(dto.aliases);
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (Object.keys(patch).length === 0) return this.findMine(ctx, id);

    try {
      const updated = await this.symbols
        .findOneAndUpdate(
          { _id: this.objectId(id), providerOrganizationId: ctx.organizationId },
          { $set: patch },
          { new: true, runValidators: true },
        )
        .lean();
      if (!updated) throw new NotFoundException('Symbol not found');
      return SymbolMapper.toResponse(updated);
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('Another symbol with that name already exists');
      throw error;
    }
  }

  async setStatus(ctx: AuthContext, id: string, isActive: boolean): Promise<SymbolResponseDto> {
    const updated = await this.symbols
      .findOneAndUpdate(
        { _id: this.objectId(id), providerOrganizationId: ctx.organizationId },
        { $set: { isActive } },
        { new: true },
      )
      .lean();
    if (!updated) throw new NotFoundException('Symbol not found');
    return SymbolMapper.toResponse(updated);
  }

  async remove(ctx: AuthContext, id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.symbols.findOneAndDelete({
      _id: this.objectId(id),
      providerOrganizationId: ctx.organizationId,
    });
    if (!deleted) throw new NotFoundException('Symbol not found');
    return { deleted: true };
  }
}
