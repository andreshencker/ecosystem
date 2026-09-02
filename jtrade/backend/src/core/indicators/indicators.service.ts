import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { AuthContext } from '../auth/types/auth-context';
import { Symbol, SymbolDocument } from '../symbols/schemas/symbol.schema';
import { AddChannelDto } from './dto/add-channel.dto';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { IndicatorResponseDto } from './dto/indicator-response.dto';
import { IndicatorMapper } from './mappers/indicator.mapper';
import { Indicator, IndicatorDocument } from './schemas/indicator.schema';

@Injectable()
export class IndicatorsService {
  constructor(
    @InjectModel(Indicator.name)
    private readonly indicators: Model<IndicatorDocument>,
    @InjectModel(Symbol.name)
    private readonly symbols: Model<SymbolDocument>,
  ) {}

  private objectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid indicator id');
    return new Types.ObjectId(id);
  }

  /** 32-hex opaque credential for a TradingView alert. */
  private newKey(): string {
    return randomBytes(16).toString('hex');
  }

  private normalizeKey(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9_-]/g, '');
  }

  /** Asserts a symbol exists in the caller's organization; returns its ObjectId. */
  private async assertOwnedSymbol(ctx: AuthContext, symbolId: string): Promise<Types.ObjectId> {
    if (!Types.ObjectId.isValid(symbolId)) throw new BadRequestException('Invalid symbol id');
    const found = await this.symbols
      .findOne({ _id: new Types.ObjectId(symbolId), providerOrganizationId: ctx.organizationId })
      .select('_id')
      .lean();
    if (!found) throw new BadRequestException('That symbol does not exist in your organization');
    return found._id as Types.ObjectId;
  }

  /** symbolId -> symbol string, for every symbol referenced by the given indicator docs. */
  private async symbolNameMap(docs: any[]): Promise<Map<string, string>> {
    const ids = new Set<string>();
    for (const doc of docs) {
      for (const pair of doc.pairs ?? []) ids.add(pair.symbolId?.toString?.() ?? String(pair.symbolId));
    }
    if (ids.size === 0) return new Map();
    const rows = await this.symbols
      .find({ _id: { $in: [...ids].map((id) => new Types.ObjectId(id)) } })
      .select('symbol')
      .lean();
    return new Map(rows.map((r) => [String(r._id), r.symbol]));
  }

  private async map(doc: any): Promise<IndicatorResponseDto> {
    return IndicatorMapper.toResponse(doc, await this.symbolNameMap([doc]));
  }

  private async mapList(list: any[]): Promise<IndicatorResponseDto[]> {
    return IndicatorMapper.toResponseList(list, await this.symbolNameMap(list));
  }

  async create(ctx: AuthContext, dto: CreateIndicatorDto): Promise<IndicatorResponseDto> {
    const key = this.normalizeKey(dto.key);
    if (key.length < 2) throw new BadRequestException('Key must contain at least 2 usable characters');
    try {
      const doc = await this.indicators.create({
        providerOrganizationId: ctx.organizationId,
        createdByGrapiflyUserId: ctx.grapiflyUserId,
        name: dto.name.trim(),
        key,
        description: dto.description?.trim() ?? '',
        webhookSlug: this.newKey(),
        webhookLastReceivedAt: null,
        pairs: [],
        isActive: dto.isActive ?? true,
      });
      return this.map(doc.toObject());
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('An indicator with this key already exists in your organization');
      }
      throw error;
    }
  }

  async listMine(ctx: AuthContext): Promise<IndicatorResponseDto[]> {
    const list = await this.indicators
      .find({ providerOrganizationId: ctx.organizationId })
      .sort({ updatedAt: -1 })
      .lean();
    return this.mapList(list);
  }

  async findMine(ctx: AuthContext, id: string): Promise<IndicatorResponseDto> {
    const doc = await this.indicators
      .findOne({ _id: this.objectId(id), providerOrganizationId: ctx.organizationId })
      .lean();
    if (!doc) throw new NotFoundException('Indicator not found');
    return this.map(doc);
  }

  async update(ctx: AuthContext, id: string, dto: UpdateIndicatorDto): Promise<IndicatorResponseDto> {
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.description !== undefined) patch.description = dto.description.trim();
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    if (Object.keys(patch).length === 0) return this.findMine(ctx, id);

    const updated = await this.indicators
      .findOneAndUpdate(
        { _id: this.objectId(id), providerOrganizationId: ctx.organizationId },
        { $set: patch },
        { new: true, runValidators: true },
      )
      .lean();
    if (!updated) throw new NotFoundException('Indicator not found');
    return this.map(updated);
  }

  /** Generates a new webhook slug for the indicator, invalidating every TradingView alert URL. */
  async rotateWebhook(ctx: AuthContext, indicatorId: string): Promise<IndicatorResponseDto> {
    const updated = await this.indicators
      .findOneAndUpdate(
        { _id: this.objectId(indicatorId), providerOrganizationId: ctx.organizationId },
        { $set: { webhookSlug: this.newKey(), webhookLastReceivedAt: null } },
        { new: true },
      )
      .lean();
    if (!updated) throw new NotFoundException('Indicator not found');
    return this.map(updated);
  }

  /**
   * Public webhook receiver. Resolves the slug to an indicator, matches the key to
   * one of its alert channels, and records that a signal arrived. Parsing the
   * payload / dedupe / persisting a Signal is the signals module (deferred).
   */
  async ingestWebhook(slug: string, key: string): Promise<{
    ok: boolean;
    indicatorId?: string;
    channelId?: string;
    action?: 'BUY' | 'SELL';
    symbol?: string;
    timeframe?: string;
  }> {
    const cleanSlug = (slug ?? '').trim();
    const cleanKey = (key ?? '').trim();
    if (!cleanSlug || !cleanKey) return { ok: false };

    const doc = await this.indicators.findOne({ webhookSlug: cleanSlug });
    if (!doc || !doc.isActive) return { ok: false };

    const pair = (doc.pairs as any[]).find(
      (p) => p.buyKey === cleanKey || p.sellKey === cleanKey,
    );
    if (!pair || pair.enabled === false) return { ok: false };

    const action: 'BUY' | 'SELL' = pair.buyKey === cleanKey ? 'BUY' : 'SELL';
    const now = new Date();
    pair.lastSignalAt = now;
    doc.webhookLastReceivedAt = now;
    await doc.save();

    const sym = await this.symbols.findById(pair.symbolId).select('symbol').lean();

    return {
      ok: true,
      indicatorId: String(doc._id),
      channelId: String(pair._id),
      action,
      symbol: sym?.symbol,
      timeframe: pair.timeframe,
    };
  }

  /** Adds one alert channel (symbol + timeframe) to the indicator and mints its BUY/SELL keys. */
  async addChannel(ctx: AuthContext, indicatorId: string, dto: AddChannelDto): Promise<IndicatorResponseDto> {
    const symbolId = await this.assertOwnedSymbol(ctx, dto.symbolId);
    const doc = await this.indicators.findOne({
      _id: this.objectId(indicatorId),
      providerOrganizationId: ctx.organizationId,
    });
    if (!doc) throw new NotFoundException('Indicator not found');

    const exists = (doc.pairs as any[]).some(
      (p) => String(p.symbolId) === String(symbolId) && p.timeframe === dto.timeframe,
    );
    if (exists) throw new ConflictException('That symbol + timeframe alert already exists on this indicator');

    (doc.pairs as any[]).push({
      _id: new Types.ObjectId(),
      symbolId,
      timeframe: dto.timeframe,
      buyKey: this.newKey(),
      sellKey: this.newKey(),
      enabled: true,
      lastSignalAt: null,
    });
    await doc.save();
    return this.map(doc.toObject());
  }

  /** Removes one alert channel from the indicator. */
  async removeChannel(ctx: AuthContext, indicatorId: string, channelId: string): Promise<IndicatorResponseDto> {
    if (!Types.ObjectId.isValid(channelId)) throw new BadRequestException('Invalid channel id');
    const doc = await this.indicators.findOne({
      _id: this.objectId(indicatorId),
      providerOrganizationId: ctx.organizationId,
    });
    if (!doc) throw new NotFoundException('Indicator not found');

    const before = (doc.pairs as any[]).length;
    doc.pairs = (doc.pairs as any[]).filter((p) => String(p._id) !== channelId) as any;
    if ((doc.pairs as any[]).length === before) throw new NotFoundException('Alert channel not found');

    await doc.save();
    return this.map(doc.toObject());
  }

  /** Toggles a single alert channel on/off without touching its keys or the other channels. */
  async setChannelEnabled(
    ctx: AuthContext,
    indicatorId: string,
    channelId: string,
    enabled: boolean,
  ): Promise<IndicatorResponseDto> {
    if (!Types.ObjectId.isValid(channelId)) throw new BadRequestException('Invalid channel id');
    const doc = await this.indicators.findOne({
      _id: this.objectId(indicatorId),
      providerOrganizationId: ctx.organizationId,
    });
    if (!doc) throw new NotFoundException('Indicator not found');

    const pair = (doc.pairs as any[]).find((p) => String(p._id) === channelId);
    if (!pair) throw new NotFoundException('Alert channel not found');

    pair.enabled = enabled;
    await doc.save();
    return this.map(doc.toObject());
  }

  /** Regenerates the BUY and SELL keys for one alert channel. The channel id is stable. */
  async rotateChannelKeys(ctx: AuthContext, indicatorId: string, channelId: string): Promise<IndicatorResponseDto> {
    if (!Types.ObjectId.isValid(channelId)) throw new BadRequestException('Invalid channel id');
    const doc = await this.indicators.findOne({
      _id: this.objectId(indicatorId),
      providerOrganizationId: ctx.organizationId,
    });
    if (!doc) throw new NotFoundException('Indicator not found');

    const pair = (doc.pairs as any[]).find((p) => String(p._id) === channelId);
    if (!pair) throw new NotFoundException('Alert channel not found');

    pair.buyKey = this.newKey();
    pair.sellKey = this.newKey();
    await doc.save();
    return this.map(doc.toObject());
  }

  async remove(ctx: AuthContext, id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.indicators.findOneAndDelete({
      _id: this.objectId(id),
      providerOrganizationId: ctx.organizationId,
    });
    if (!deleted) throw new NotFoundException('Indicator not found');
    return { deleted: true };
  }
}
