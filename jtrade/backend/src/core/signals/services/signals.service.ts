import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';

import { Signal, SignalAction, SignalDocument } from '../schemas/signal.schema';
import { CreateMetatraderSignalDto } from '../dto/create-metatrader-signal.dto';
import { GetSignalInformationDto } from '../dto/get-signal-information.dto';
import { ClientSignalListQueryDto } from '../dto/client-signal-list-query.dto';

import { AdminIndicatorsService } from '../../admin-indicators/admin-indicators.service';
import { SymbolExecutionsService } from '../../symbol-executions/symbol-executions.service';

import { Alert, AlertDocument } from '../../alerts/schemas/alert.schema';
import { AdminSignalListQueryDto } from '../dto/admin-signal-list-query.dto';
import { buildDateRangeFilter } from '../../../common/utils/build-date-range-filter.util';
import { Symbol, SymbolDocument } from '../../symbols/schemas/symbol.schema';
import { ConfigService } from '@nestjs/config';
import {
  CodeProjectVersion,
  CodeProjectVersionDocument,
} from '../../code-project-versions/schemas/code-project-version.schema';

@Injectable()
export class SignalsService {
  // ── Cache de señales pre-computadas ────────────────────────
  private signalCache = new Map<string, string>();

  // ── Cache del mapa de símbolos conocidos ───────────────────
  private symbolMap = new Map<string, string>();
  private lastSymbolMapLoad = 0;
  private readonly SYMBOL_MAP_TTL_MS = 5 * 60 * 1000; // 5 minutos

  constructor(
    @InjectModel(Signal.name)
    private readonly signalDocumentModel: Model<SignalDocument>,
    @InjectModel(Alert.name)
    private readonly alertDocumentModel: Model<AlertDocument>,
    @InjectModel(Symbol.name)
    private readonly symbolDocumentModel: Model<SymbolDocument>,
    @InjectModel(CodeProjectVersion.name)
    private readonly codeProjectVersionDocumentModel: Model<CodeProjectVersionDocument>,

    private readonly adminIndicators: AdminIndicatorsService,
    private readonly symbolExecutionsService: SymbolExecutionsService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  //   SYMBOL NORMALIZATION
  // ============================================================

  private async loadSymbolMap(): Promise<void> {
    const now = Date.now();

    if (
      this.symbolMap.size > 0 &&
      now - this.lastSymbolMapLoad < this.SYMBOL_MAP_TTL_MS
    )
      return;

    const docs = await this.symbolDocumentModel
      .find({ isActive: true })
      .select('symbol aliases')
      .lean()
      .exec();

    this.symbolMap.clear();

    for (const doc of docs) {
      const base = doc.symbol.toUpperCase();

      // El symbol se mapea a sí mismo
      this.symbolMap.set(base, doc.symbol);

      // Cada alias apunta al symbol base
      for (const alias of (doc as any).aliases ?? []) {
        this.symbolMap.set(alias.trim().toUpperCase(), doc.symbol);
      }
    }

    this.lastSymbolMapLoad = now;
    console.log(
      `[SYMBOLS] Loaded ${this.symbolMap.size} mappings from ${docs.length} symbols`,
    );
  }

  // Normaliza cualquier símbolo al nombre canónico
  async normalizeSymbol(symbol: string): Promise<string> {
    await this.loadSymbolMap();

    const upper = symbol.trim().toUpperCase();

    // 1. Match exacto
    if (this.symbolMap.has(upper)) return this.symbolMap.get(upper)!;

    // 2. El símbolo contiene un alias conocido
    for (const [alias, base] of this.symbolMap.entries()) {
      if (upper.includes(alias)) return base;
    }

    // 3. Fallback — limpiar caracteres especiales
    return upper.split('.')[0].split('#')[0].split('_')[0].split('-')[0];
  }

  // ============================================================
  //   EA VERSION VALIDATION
  // ============================================================

  private async isEaVersionValid(
    eaVersion?: string,
    eaVersionId?: string,
  ): Promise<boolean> {
    if (!eaVersionId || !eaVersion) return false;

    const versionDoc = await this.codeProjectVersionDocumentModel
      .findOne({ projectCodePlatformId: eaVersionId })
      .lean()
      .exec();

    if (!versionDoc) return false;
    if (!versionDoc.isActive) return false;

    // Validar versión exacta
    return eaVersion === versionDoc.version;
  }

  // ============================================================
  //   SIGNAL EXPIRATION
  // ============================================================

  private getSignalExpirationMs(timeFrame: string): number {
    const map: Record<string, number> = {
      M1: 30_000,
      M5: 60_000,
      M15: 120_000,
      M30: 180_000,
      H1: 300_000,
      H4: 600_000,
      D1: 1_800_000,
    };
    return map[timeFrame] ?? 120_000;
  }

  // Cooldown por vela — evita señales duplicadas de TradingView
  private getSignalCooldownMs(timeFrame: string): number {
    const map: Record<string, number> = {
      M1: 60_000,
      M5: 300_000,
      M15: 900_000,
      M30: 1_800_000,
      H1: 3_600_000,
      H4: 14_400_000,
      D1: 86_400_000,
    };
    return map[timeFrame] ?? 900_000;
  }

  // ============================================================
  //   CREATE SIGNAL (Webhook - TradingView)
  // ============================================================

  async createMt5Signal(
    dto: CreateMetatraderSignalDto,
  ): Promise<SignalDocument> {
    // 1. Validar webhook
    const validation = await this.adminIndicators.validateAdminIndicatorWebhook(
      dto.webHookKey,
    );

    if (!validation?.exists || !validation?.ok || !validation?.adminIndicatorId)
      throw new UnauthorizedException('Invalid webhook credentials');

    // 2. Buscar alert activa
    const alert = await this.alertDocumentModel
      .findOne({ _id: dto.alertId, isActive: true })
      .lean()
      .exec();

    if (!alert) throw new UnauthorizedException('Invalid or inactive alert');

    // 3. Validar que el indicador del webhook corresponde al de la alerta
    if (
      validation.indicatorProjectId?.toString() !==
      alert.indicatorProjectId?.toString()
    )
      throw new UnauthorizedException(
        'Indicator mismatch for webhook credentials',
      );

    // 4. Normalizar símbolo — usa nombre canónico independiente del broker
    const rawSymbol = (alert.symbol ?? '').trim().toUpperCase();
    if (!rawSymbol) throw new BadRequestException('Missing symbol');

    const symbol = await this.normalizeSymbol(rawSymbol);

    const timeFrame = (alert.timeFrame ?? '').trim().toUpperCase();
    if (!timeFrame) throw new BadRequestException('Missing TimeFrame');

    const action =
      alert.action === 'BUY' ? SignalAction.BUY : SignalAction.SELL;

    // 5. Cooldown — bloquear señal duplicada dentro de la misma vela
    const recentSignal = await this.signalDocumentModel
      .findOne({
        symbol,
        timeFrame,
        action,
        createdAt: {
          $gte: new Date(Date.now() - this.getSignalCooldownMs(timeFrame)),
        },
      })
      .lean()
      .exec();

    if (recentSignal) {
      const ageSeconds = Math.floor(
        (Date.now() -
          new Date(recentSignal.createdAt ?? Date.now()).getTime()) /
          1000,
      );
      console.warn(
        `[SIGNAL] Duplicate blocked | ${symbol} ${timeFrame} ${action} | Last signal was ${ageSeconds}s ago`,
      );
      return recentSignal as SignalDocument;
    }

    // 6. Crear señal
    return this.signalDocumentModel.create({
      signalId: randomUUID(),
      adminIndicatorId: new Types.ObjectId(validation.adminIndicatorId),
      alertId: new Types.ObjectId(alert._id),
      indicatorId: new Types.ObjectId(alert.indicatorProjectId),
      action,
      symbol,
      timeFrame,
    });
  }

  // ============================================================
  //   GET SIGNAL FOR MT5 EA
  // ============================================================

  getMt5SignalInformation = async (
    data: GetSignalInformationDto,
  ): Promise<string> => {
    // 1. Validar versión del EA
    const versionCheck = await this.isEaVersionValid(
      data.eaVersion,
      data.eaVersionId,
    );

    if (!versionCheck) return 'EA version or EA version Id invalid';

    console.log('Data incoming: ', JSON.stringify(data, null, 2));
    // 2. Normalizar símbolo que manda el EA
    const symbol = await this.normalizeSymbol(data.symbol);

    console.log('Normalized symbol: ', JSON.stringify(symbol, null, 2));

    // 3. Buscar cuenta con símbolo normalizado
    const account = await this.symbolExecutionsService.getByAccountRef(
      data.accountNumber,
      symbol,
      data.timeFrame,
    );

    if (!account) return 'No account configuration';

    // 4. Buscar última señal del indicador de esta cuenta
    const signal = await this.signalDocumentModel
      .findOne({
        symbol: symbol,
        timeFrame: data.timeFrame,
        indicatorId: account.indicatorProjectId,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!signal) return 'No signal information';

    // 5. Señal ya procesada por este EA
    if (data.latestSignalId?.trim() && signal.signalId === data.latestSignalId)
      return 'Signal already exists';

    // 6. Validar suscripción activa
    const subscription = account.subscriptions.find(
      (s: any) => s.symbol === symbol && s.timeFrame === data.timeFrame,
    );

    if (!subscription) return 'No subscription for symbol';
    if (!subscription.isActive) return 'No active subscription for symbol';

    // 7. Validar expiración de la señal
    const ageMs =
      Date.now() - new Date(signal.createdAt ?? Date.now()).getTime();
    const expirationMs = this.getSignalExpirationMs(signal.timeFrame);

    if (ageMs > expirationMs) {
      console.warn(
        `[SIGNAL] Expired | Symbol=${signal.symbol} | TF=${signal.timeFrame} | Age=${Math.floor(ageMs / 1000)}s`,
      );
      return 'Signal expired';
    }

    // 8. Armar y devolver señal formateada
    return (
      `userPlatformId=${account.platform ?? ''};` +
      `signalId=${signal.signalId};` +
      `canTrade=${account.canTrade ? 'true' : 'false'};` +
      `action=${signal.action};` +
      `timeFrame=${signal.timeFrame};` +
      `riskPercent=${subscription.riskPercent};` +
      `rrRatio=${subscription.returnRatio};` +
      `stopDistancePips=${subscription.stopDistancePips};` +
      `atrMultiplier=${subscription.atrMultiplier};` +
      `atrPeriod=${subscription.atrPeriod};` +
      `useTrailingStop=${subscription.useTrailingStop};` +
      `useStopLoss=${subscription.useStopLoss};` +
      `useTakeProfit=${subscription.useTakeProfit ?? true};` +
      `useBreakEven=${subscription.useBreakEven ?? true};` +
      `useDrawdownLimit=${account.useDrawdownLimit ? 'true' : 'false'};` + // ← ahora desde account
      `maxDrawdownPercent=${account.maxDrawdownPercent ?? 0};` + // ← ahora desde account
      `useProfitLimit=${account.useProfitLimit ? 'true' : 'false'};` + // ← ahora desde account
      `maxProfitPercent=${account.maxProfitPercent ?? 0};` + // ← ahora desde account
      `createdAt=${new Date(signal.createdAt ?? Date.now()).getTime()};`
    );
  };

  // ============================================================
  //   ADMIN SIGNALS LIST
  // ============================================================

  async getAdminSignals(q: AdminSignalListQueryDto = {}) {
    const match: any = {};

    if (q.symbol) match.symbol = q.symbol.trim().toUpperCase();
    if (q.timeFrame) match.timeFrame = q.timeFrame.trim().toUpperCase();

    const createdAtFilter = buildDateRangeFilter({
      lastHours: q.lastHours,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
    });

    if (createdAtFilter) match.createdAt = createdAtFilter;

    const pipeline: any[] = [
      { $match: match },
      {
        $lookup: {
          from: 'alerts',
          localField: 'alertId',
          foreignField: '_id',
          as: 'alert',
        },
      },
      { $unwind: '$alert' },
      {
        $lookup: {
          from: 'indicators',
          localField: 'alert.indicatorId',
          foreignField: '_id',
          as: 'indicator',
        },
      },
      { $unwind: '$indicator' },
      {
        $lookup: {
          from: 'admin_indicators',
          localField: 'adminIndicatorId',
          foreignField: '_id',
          as: 'adminIndicator',
        },
      },
      { $unwind: '$adminIndicator' },
      {
        $lookup: {
          from: 'user_platforms',
          localField: 'adminIndicator.userPlatformId',
          foreignField: '_id',
          as: 'userPlatform',
        },
      },
      { $unwind: '$userPlatform' },
      {
        $lookup: {
          from: 'users',
          localField: 'userPlatform.userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ];

    if (q.indicatorId) {
      if (!Types.ObjectId.isValid(q.indicatorId))
        throw new BadRequestException('Invalid indicatorId');
      pipeline.push({
        $match: { 'alert.indicatorId': new Types.ObjectId(q.indicatorId) },
      });
    }

    if (q.adminIndicatorId) {
      if (!Types.ObjectId.isValid(q.adminIndicatorId))
        throw new BadRequestException('Invalid adminIndicatorId');
      pipeline.push({
        $match: { adminIndicatorId: new Types.ObjectId(q.adminIndicatorId) },
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 0,
          signalId: 1,
          alertId: { $toString: '$alertId' },
          symbol: 1,
          timeFrame: 1,
          action: 1,
          isActive: 1,
          createdAt: 1,
          indicator: {
            id: { $toString: '$indicator._id' },
            name: '$indicator.name',
            key: '$indicator.key',
          },
          createdBy: {
            name: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$user.firstName', ''] },
                    ' ',
                    { $ifNull: ['$user.middleName', ''] },
                    ' ',
                    { $ifNull: ['$user.lastName', ''] },
                    ' ',
                    { $ifNull: ['$user.secondLastName', ''] },
                  ],
                },
              },
            },
          },
        },
      },
      { $sort: { createdAt: -1 } },
    );

    return this.signalDocumentModel.aggregate(pipeline).exec();
  }

  // ============================================================
  //   CLIENT SIGNALS LIST
  // ============================================================

  async getClientSignals(q: ClientSignalListQueryDto = {}) {
    const matchSignal: any = {};

    if (q.symbol) matchSignal.symbol = q.symbol.trim().toUpperCase();
    if (q.timeFrame) matchSignal.timeFrame = q.timeFrame.trim().toUpperCase();

    const createdAtFilter = buildDateRangeFilter({
      lastHours: q.lastHours,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
    });

    if (createdAtFilter) matchSignal.createdAt = createdAtFilter;

    const pipeline: any[] = [
      { $match: matchSignal },
      {
        $lookup: {
          from: 'alerts',
          localField: 'alertId',
          foreignField: '_id',
          as: 'alert',
        },
      },
      { $unwind: '$alert' },
    ];

    if (q.indicatorId) {
      if (!Types.ObjectId.isValid(q.indicatorId))
        throw new BadRequestException('Invalid indicatorId');
      pipeline.push({
        $match: { 'alert.indicatorId': new Types.ObjectId(q.indicatorId) },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'indicators',
          localField: 'alert.indicatorId',
          foreignField: '_id',
          as: 'indicator',
        },
      },
      { $unwind: { path: '$indicator', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          signalId: '$signalId',
          alertId: { $toString: '$alertId' },
          symbol: '$symbol',
          timeFrame: '$timeFrame',
          action: '$action',
          isActive: '$isActive',
          createdAt: '$createdAt',
          indicator: {
            id: {
              $cond: [
                { $ifNull: ['$indicator._id', false] },
                { $toString: '$indicator._id' },
                null,
              ],
            },
            name: '$indicator.name',
            key: '$indicator.key',
          },
        },
      },
      { $sort: { createdAt: -1 } },
    );

    return this.signalDocumentModel.aggregate(pipeline).exec();
  }
}