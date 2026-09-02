import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';

import type { AuthContext } from '../auth/types/auth-context';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { ProductVersion, ProductVersionDocument } from '../products/schemas/product-version.schema';
import { Symbol, SymbolDocument } from '../symbols/schemas/symbol.schema';
import { SignalsService, signalExpirationMs } from '../signals/signals.service';
import { Signalbot, SignalbotDocument } from './schemas/signalbot.schema';
import { SignalResult, SignalResultDocument } from './schemas/signal-result.schema';
import {
  CreateSignalbotDto, ExecutionDto, RuntimeQueryDto, RuntimeResultDto, UpdateExecutionDto, UpdateSignalbotDto,
} from './dto/signalbot.dto';

@Injectable()
export class SignalbotsService {
  private readonly log = new Logger(SignalbotsService.name);

  constructor(
    @InjectModel(Signalbot.name) private readonly bots: Model<SignalbotDocument>,
    @InjectModel(SignalResult.name) private readonly results: Model<SignalResultDocument>,
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(ProductVersion.name) private readonly versions: Model<ProductVersionDocument>,
    @InjectModel(Symbol.name) private readonly symbols: Model<SymbolDocument>,
    private readonly signals: SignalsService,
  ) {}

  private oid(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    return new Types.ObjectId(id);
  }
  private newToken() {
    return randomBytes(16).toString('hex');
  }

  // ── client CRUD ──────────────────────────────────────────────────────────

  async listMine(ctx: AuthContext) {
    return this.bots
      .find({ grapiflyUserId: ctx.grapiflyUserId })
      .populate({ path: 'productId', select: 'name key platformId params native' })
      .sort({ updatedAt: -1 })
      .lean();
  }

  /** Derives the channel list a published product exposes through its bundled indicators. */
  private async channelsForProduct(productId: Types.ObjectId | string, taken: Set<string>) {
    const product = await this.products.findById(productId).lean();
    const indicatorIds = (product?.indicatorIds ?? []) as Types.ObjectId[];
    const IndicatorModel = this.bots.db.model('Indicator');
    const indicators: any[] = await IndicatorModel
      .find({ _id: { $in: indicatorIds }, isActive: true })
      .select('name pairs')
      .lean();

    const symIds = indicators.flatMap((i) => (i.pairs ?? []).map((p: any) => p.symbolId));
    const syms = await this.symbols.find({ _id: { $in: symIds } }).select('symbol').lean();
    const symName = new Map(syms.map((s) => [String(s._id), s.symbol]));

    return indicators.flatMap((ind) =>
      (ind.pairs ?? [])
        .filter((p: any) => p.enabled !== false)
        .map((p: any) => ({
          channelId: String(p._id),
          indicatorId: String(ind._id),
          indicatorName: ind.name,
          symbol: symName.get(String(p.symbolId)) ?? '',
          timeframe: p.timeframe,
          alreadyAdded: taken.has(String(p._id)),
        })),
    );
  }

  /** The channels this bot's product exposes — for the client's "add channel" picker. */
  async availableChannels(ctx: AuthContext, id: string) {
    const bot = await this.mine(ctx, id);
    const taken = new Set((bot.symbolExecutions as any[]).map((e) => String(e.channelId)));
    return this.channelsForProduct(bot.productId, taken);
  }

  /** Same list, but keyed off a product directly — for the "new bot" form (no bot exists yet). */
  async productChannels(_ctx: AuthContext, productId: string) {
    const product = await this.products
      .findOne({ _id: this.oid(productId), status: 'published' })
      .lean();
    if (!product) throw new NotFoundException('Product not available');
    return this.channelsForProduct(product._id, new Set());
  }

  async create(ctx: AuthContext, dto: CreateSignalbotDto) {
    const product = await this.products
      .findOne({ _id: this.oid(dto.productId), status: 'published' })
      .lean();
    if (!product) throw new NotFoundException('Product not available');

    const created = await this.bots.create({
      grapiflyUserId: ctx.grapiflyUserId,
      clientOrganizationId: ctx.organizationId,
      productId: product._id,
      providerOrganizationId: product.providerOrganizationId,
      token: this.newToken(),
      accountRef: dto.accountRef?.trim() || null,
      accountLabel: dto.accountLabel?.trim() || null,
      canTrade: dto.canTrade ?? false,
      useDrawdownLimit: dto.useDrawdownLimit ?? false,
      useProfitLimit: dto.useProfitLimit ?? false,
      maxDrawdownPercent: dto.maxDrawdownPercent ?? 0,
      maxProfitPercent: dto.maxProfitPercent ?? 0,
      isActive: true,
      symbolExecutions: [],
    });
    return created.toObject();
  }

  private async mine(ctx: AuthContext, id: string): Promise<SignalbotDocument> {
    const bot = await this.bots.findOne({ _id: this.oid(id), grapiflyUserId: ctx.grapiflyUserId });
    if (!bot) throw new NotFoundException('Signalbot not found');
    return bot;
  }

  async update(ctx: AuthContext, id: string, dto: UpdateSignalbotDto) {
    const bot = await this.mine(ctx, id);
    if (dto.accountRef !== undefined) bot.accountRef = dto.accountRef.trim() || null;
    if (dto.accountLabel !== undefined) bot.accountLabel = dto.accountLabel.trim() || null;
    if (dto.canTrade !== undefined) bot.canTrade = dto.canTrade;
    if (dto.useDrawdownLimit !== undefined) bot.useDrawdownLimit = dto.useDrawdownLimit;
    if (dto.useProfitLimit !== undefined) bot.useProfitLimit = dto.useProfitLimit;
    if (dto.maxDrawdownPercent !== undefined) bot.maxDrawdownPercent = dto.maxDrawdownPercent;
    if (dto.maxProfitPercent !== undefined) bot.maxProfitPercent = dto.maxProfitPercent;
    if (dto.isActive !== undefined) bot.isActive = dto.isActive;
    await bot.save();
    return bot.toObject();
  }

  async remove(ctx: AuthContext, id: string) {
    const bot = await this.mine(ctx, id);
    await bot.deleteOne();
    return { deleted: true };
  }

  async rotateToken(ctx: AuthContext, id: string) {
    const bot = await this.mine(ctx, id);
    bot.token = this.newToken();
    await bot.save();
    return bot.toObject();
  }

  /** Adds a channel to the bot, resolving its symbol/timeframe/indicator from the indicator's pair. */
  async addExecution(ctx: AuthContext, id: string, dto: ExecutionDto) {
    const bot = await this.mine(ctx, id);
    const channelOid = this.oid(dto.channelId);

    if ((bot.symbolExecutions as any[]).some((e) => String(e.channelId) === String(channelOid))) {
      throw new ConflictException('That channel is already on this bot');
    }

    // The product must bundle an indicator whose pairs contains this channel.
    const product = await this.products.findById(bot.productId).lean();
    const indicatorIds = (product?.indicatorIds ?? []) as Types.ObjectId[];
    const IndicatorModel = this.bots.db.model('Indicator');
    const indicator: any = await IndicatorModel
      .findOne({ _id: { $in: indicatorIds }, 'pairs._id': channelOid })
      .lean();
    if (!indicator) throw new BadRequestException('That channel is not in this product');
    const pair = indicator.pairs.find((p: any) => String(p._id) === String(channelOid));
    const sym: any = await this.symbols.findById(pair.symbolId).select('symbol').lean();

    (bot.symbolExecutions as any[]).push({
      channelId: channelOid,
      indicatorId: indicator._id,
      symbol: sym?.symbol ?? '',
      timeFrame: pair.timeframe,
      contractSize: dto.contractSize ?? 0,
      riskPercent: dto.riskPercent ?? 0,
      stopDistancePips: dto.stopDistancePips ?? 0,
      returnRatio: dto.returnRatio ?? 0,
      isActive: dto.isActive ?? true,
      useStopLoss: dto.useStopLoss ?? true,
      useTakeProfit: dto.useTakeProfit ?? true,
      useTrailingStop: dto.useTrailingStop ?? false,
      useBreakEven: dto.useBreakEven ?? true,
      atrPeriod: dto.atrPeriod ?? 0,
      atrMultiplier: dto.atrMultiplier ?? 0,
      closeTradesOnWeekend: dto.closeTradesOnWeekend ?? false,
    });
    await bot.save();
    return bot.toObject();
  }

  async updateExecution(ctx: AuthContext, id: string, channelId: string, dto: UpdateExecutionDto) {
    const bot = await this.mine(ctx, id);
    const exec = (bot.symbolExecutions as any[]).find((e) => String(e.channelId) === channelId);
    if (!exec) throw new NotFoundException('Channel not on this bot');
    for (const [k, v] of Object.entries(dto)) if (v !== undefined) exec[k] = v;
    await bot.save();
    return bot.toObject();
  }

  async removeExecution(ctx: AuthContext, id: string, channelId: string) {
    const bot = await this.mine(ctx, id);
    const before = (bot.symbolExecutions as any[]).length;
    bot.symbolExecutions = (bot.symbolExecutions as any[]).filter((e) => String(e.channelId) !== channelId) as any;
    if ((bot.symbolExecutions as any[]).length === before) throw new NotFoundException('Channel not on this bot');
    await bot.save();
    return bot.toObject();
  }

  // ── runtime (the EA) ─────────────────────────────────────────────────────

  private async normalizeSymbol(raw: string): Promise<string> {
    const upper = (raw ?? '').trim().toUpperCase();
    if (!upper) return upper;
    const hit = await this.symbols
      .findOne({ $or: [{ symbol: upper }, { aliases: upper }] })
      .select('symbol')
      .lean();
    if (hit) return hit.symbol;
    // fallback: strip common broker suffixes
    return upper.split('.')[0].split('#')[0].split('_')[0].split('-')[0];
  }

  private async currentVersion(productId: Types.ObjectId) {
    return this.versions.findOne({ productId, isCurrentVersion: true }).select('version').lean();
  }

  /** The polling endpoint. Returns the actionable envelope or a sentinel string. */
  async getSignal(productKey: string, q: RuntimeQueryDto): Promise<string | Record<string, unknown>> {
    const bot = await this.bots.findOne({ token: (q.token ?? '').trim() });
    if (!bot) return 'No bot configuration';

    const product = await this.products.findById(bot.productId).lean();
    if (!product || product.key !== productKey) return 'Product mismatch';

    const version = await this.currentVersion(bot.productId as Types.ObjectId);
    if (version && q.eaVersion && q.eaVersion.trim() !== version.version) {
      return 'EA version invalid';
    }

    const symbol = await this.normalizeSymbol(q.symbol);
    const tf = q.timeframe.trim().toUpperCase();
    const exec = (bot.symbolExecutions as any[]).find(
      (e) => e.symbol === symbol && e.timeFrame === tf && e.isActive,
    );
    if (!exec) return 'No subscription for symbol';

    const signal = await this.signals.latestForChannel(String(exec.channelId));
    if (!signal) return 'No signal';
    if (q.lastSignalId && signal.signalId === q.lastSignalId) return 'Signal already delivered';

    const now = Date.now();
    const expiresAt = new Date(signal.expiresAt).getTime();
    if (now > expiresAt) return 'Signal expired';

    const active = bot.isActive === true;
    const envelope = {
      productId: String(product._id),
      productKey: product.key,
      codeVersion: version?.version ?? '',
      account: bot.accountRef ?? '',
      commRoute: `/backend/runtime/${product.key}`,
      subscriptionActive: active,

      'signal.id': signal.signalId,
      'signal.action': signal.action,
      'signal.symbol': signal.symbol,
      'signal.timeframe': signal.timeFrame,
      'signal.barTime': signal.barTime ? new Date(signal.barTime).getTime() : '',
      'signal.expiresAt': expiresAt,

      'params.canTrade': bot.canTrade,
      'params.useDrawdownLimit': bot.useDrawdownLimit,
      'params.maxDrawdownPercent': bot.maxDrawdownPercent,
      'params.useProfitLimit': bot.useProfitLimit,
      'params.maxProfitPercent': bot.maxProfitPercent,
      'params.contractSize': exec.contractSize,
      'params.riskPercent': exec.riskPercent,
      'params.rrRatio': exec.returnRatio,
      'params.stopDistancePips': exec.stopDistancePips,
      'params.useStopLoss': exec.useStopLoss,
      'params.useTakeProfit': exec.useTakeProfit,
      'params.useBreakEven': exec.useBreakEven,
      'params.useTrailingStop': exec.useTrailingStop,
      'params.atrPeriod': exec.atrPeriod,
      'params.atrMultiplier': exec.atrMultiplier,
      'params.closeTradesOnWeekend': exec.closeTradesOnWeekend,
    };

    if (q.format === 'json') return envelope;
    return Object.entries(envelope).map(([k, v]) => `${k}=${v}`).join(';') + ';';
  }

  async reportResult(dto: RuntimeResultDto) {
    const bot = await this.bots.findOne({ token: (dto.token ?? '').trim() }).select('_id grapiflyUserId providerOrganizationId').lean();
    if (!bot) return { ok: false };
    await this.results.create({
      signalbotId: bot._id,
      signalId: dto.signalId,
      grapiflyUserId: bot.grapiflyUserId,
      providerOrganizationId: bot.providerOrganizationId,
      ticket: dto.ticket ?? null,
      entryPrice: dto.entryPrice ?? null,
      slippage: dto.slippage ?? null,
      error: dto.error ?? null,
      status: dto.error ? 'failed' : 'filled',
    });
    return { ok: true };
  }

  // reserved for future scheduled expiry sweep
  readonly expiryMs = signalExpirationMs;
}
