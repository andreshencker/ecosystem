import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  SymbolExecution,
  SymbolExecutionDocument,
} from './schemas/symbol-execution.schema';

import {
  UserAccountInfo,
  UserAccountInfoDocument,
} from '../user-account-info/schemas/user-account-info.schema';

import {
  UserProjectPlatform,
  UserProjectPlatformDocument,
} from '../user-project-platform/schemas/user-project-platform.schema';

import { Alert, AlertDocument } from '../alerts/schemas/alert.schema';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

import { CreateSymbolExecutionDto } from './dto/create-symbol-execution.dto';
import { UpdateSymbolExecutionDto } from './dto/update-symbol-execution.dto';

type GroupRow = {
  groupId: string;
  indicatorProjectId: string;
  symbol: string;
  timeFrame: string;
  isActive: boolean;
  actions: {
    id: string;
    action: 'BUY' | 'SELL';
    isActive: boolean;
  }[];
  indicatorProject?: {
    id: string;
    indicator?: {
      id: string;
      name: string;
      key: string;
      description?: string;
      isActive: boolean;
    } | null;
  } | null;
};

@Injectable()
export class SymbolExecutionsService {
  private readonly populate = [
    {
      path: 'userAccountInfo',
      select:
        'userProjectPlatformId indicatorProjectId accountRef accountLabel canTrade isActive useDrawdownLimit useProfitLimit maxDrawdownPercent maxProfitPercent',
      populate: [
        {
          path: 'userProjectPlatform',
          select: 'userId projectCodePlatformId isActive subscribedAt',
          populate: {
            path: 'projectCodePlatform',
            select:
              'codeProjectId platformId deliveryMode runtimeMode status isActive',
            populate: [
              {
                path: 'codeProject',
                select: 'name projectKey description isActive',
              },
              {
                path: 'platform',
                select:
                  'name category connectionType imageUrl isActive isSupported',
              },
            ],
          },
        },
        {
          path: 'indicatorProject',
          select:
            'indicatorId projectCodePlatformId companyProviderId isActive',
          populate: {
            path: 'indicator',
            select: 'name key description isActive',
          },
        },
      ],
    },
  ];

  constructor(
    @InjectModel(SymbolExecution.name)
    private readonly symbolExecutionModel: Model<SymbolExecutionDocument>,

    @InjectModel(UserAccountInfo.name)
    private readonly userAccountInfoModel: Model<UserAccountInfoDocument>,

    @InjectModel(UserProjectPlatform.name)
    private readonly userProjectPlatformModel: Model<UserProjectPlatformDocument>,

    @InjectModel(Alert.name)
    private readonly alertModel: Model<AlertDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async listMine(userId: Types.ObjectId) {
    await this.assertIsClient(userId);

    const userProjectPlatforms = await this.userProjectPlatformModel
      .find({ userId })
      .select('_id')
      .lean()
      .exec();

    const userProjectPlatformIds = userProjectPlatforms.map(
      (item: any) => item._id,
    );

    if (userProjectPlatformIds.length === 0) return [];

    const accounts = await this.userAccountInfoModel
      .find({
        userProjectPlatformId: {
          $in: userProjectPlatformIds,
        },
      })
      .select('_id')
      .lean()
      .exec();

    const accountIds = accounts.map((item: any) => item._id);

    if (accountIds.length === 0) return [];

    const docs = await this.symbolExecutionModel
      .find({
        userAccountInfoId: {
          $in: accountIds,
        },
      })
      .sort({ createdAt: -1 })
      .populate(this.populate as any)
      .lean()
      .exec();

    const groupIds = Array.from(
      new Set(
        (docs ?? [])
          .map((doc: any) => String(doc.alertGroupId))
          .filter(Boolean),
      ),
    );

    const groups = await this.getAlertGroupRowsByIds(groupIds);
    const groupMap = new Map(groups.map((group) => [group.groupId, group]));

    return (docs ?? []).map((doc: any) => ({
      ...doc,
      alertGroup: groupMap.get(String(doc.alertGroupId)) ?? null,
    }));
  }

  async createMine(userId: Types.ObjectId, dto: CreateSymbolExecutionDto) {
    await this.assertIsClient(userId);

    const userAccountInfoId = this.toObjectId(dto.userAccountInfoId);
    const alertGroupId = String(dto.alertGroupId ?? '').trim();

    if (!alertGroupId) {
      throw new BadRequestException('alertGroupId is required');
    }

    const account = await this.userAccountInfoModel
      .findById(userAccountInfoId)
      .select(
        'userProjectPlatformId indicatorProjectId accountRef accountLabel canTrade isActive useDrawdownLimit useProfitLimit maxDrawdownPercent maxProfitPercent',
      )
      .lean()
      .exec();

    if (!account) {
      throw new NotFoundException('UserAccountInfo not found');
    }

    if ((account as any).isActive === false) {
      throw new BadRequestException('UserAccountInfo is inactive');
    }

    await this.assertOwnershipByUserProjectPlatformId(
      userId,
      (account as any).userProjectPlatformId,
    );

    const group = await this.getAlertGroupRow(alertGroupId);

    if (!group) {
      throw new NotFoundException('Alert group not found');
    }

    if (!group.isActive) {
      throw new BadRequestException('Alert group is inactive');
    }

    if (
      String((account as any).indicatorProjectId) !==
      String(group.indicatorProjectId)
    ) {
      throw new BadRequestException(
        'Alert group indicator project does not match the account indicator project',
      );
    }

    const payload = this.buildCreatePayload(
      dto,
      userAccountInfoId,
      alertGroupId,
    );

    try {
      const created = await this.symbolExecutionModel.create(payload);

      const doc = await this.symbolExecutionModel
        .findById(created._id)
        .populate(this.populate as any)
        .lean()
        .exec();

      return {
        ...doc,
        alertGroup: group,
      };
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'SymbolExecution already exists for this userAccountInfo + alertGroupId',
        );
      }

      throw error;
    }
  }

  async updateMine(
    userId: Types.ObjectId,
    id: string,
    dto: UpdateSymbolExecutionDto,
  ) {
    await this.assertIsClient(userId);

    const _id = this.toObjectId(id);
    const doc = await this.symbolExecutionModel.findById(_id).exec();

    if (!doc) {
      throw new NotFoundException('SymbolExecution not found');
    }

    const account = await this.userAccountInfoModel
      .findById(doc.userAccountInfoId)
      .select('userProjectPlatformId')
      .lean()
      .exec();

    if (!account) {
      throw new NotFoundException('UserAccountInfo not found');
    }

    await this.assertOwnershipByUserProjectPlatformId(
      userId,
      (account as any).userProjectPlatformId,
    );

    const normalized = this.buildUpdatePayload(dto, doc);

    Object.assign(doc, normalized);

    await doc.save();

    const updated = await this.symbolExecutionModel
      .findById(doc._id)
      .populate(this.populate as any)
      .lean()
      .exec();

    const group = await this.getAlertGroupRow(String(doc.alertGroupId));

    return {
      ...updated,
      alertGroup: group,
    };
  }

  async removeMine(userId: Types.ObjectId, id: string) {
    await this.assertIsClient(userId);

    const _id = this.toObjectId(id);

    const doc = await this.symbolExecutionModel
      .findById(_id)
      .select('userAccountInfoId')
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException('SymbolExecution not found');
    }

    const account = await this.userAccountInfoModel
      .findById((doc as any).userAccountInfoId)
      .select('userProjectPlatformId')
      .lean()
      .exec();

    if (!account) {
      throw new NotFoundException('UserAccountInfo not found');
    }

    await this.assertOwnershipByUserProjectPlatformId(
      userId,
      (account as any).userProjectPlatformId,
    );

    const result = await this.symbolExecutionModel.deleteOne({ _id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('SymbolExecution not found');
    }

    return {
      deleted: true,
    };
  }

  async getByAccountRef(
    accountRef: string,
    symbol?: string,
    timeframe?: string,
  ) {
    const ref = String(accountRef ?? '').trim();

    if (!ref) {
      throw new BadRequestException('accountRef is required');
    }

    const account = await this.userAccountInfoModel
      .findOne({
        accountRef: ref,
      })
      .select(
        '_id userProjectPlatformId indicatorProjectId accountRef canTrade isActive useDrawdownLimit useProfitLimit maxDrawdownPercent maxProfitPercent',
      )
      .populate([
        {
          path: 'userProjectPlatform',
          select: 'projectCodePlatformId userId isActive',
          populate: {
            path: 'projectCodePlatform',
            select: 'platformId runtimeMode',
            populate: {
              path: 'platform',
              select: 'name',
            },
          },
        },
        {
          path: 'indicatorProject',
          select: 'indicatorId isActive',
          populate: {
            path: 'indicator',
            select: 'name key',
          },
        },
      ])
      .lean()
      .exec();

    if (!account) {
      throw new NotFoundException('UserAccountInfo not found');
    }

    const platformName = String(
      (account as any)?.userProjectPlatform?.projectCodePlatform?.platform
        ?.name ?? '',
    ).trim();

    const indicatorLabel = String(
      (account as any)?.indicatorProject?.indicator?.key ??
        (account as any)?.indicatorProject?.indicator?.name ??
        '',
    ).trim();

    const symbolNorm = symbol ? symbol.trim().toUpperCase() : undefined;
    const tfNorm = timeframe ? timeframe.trim().toUpperCase() : undefined;

    const executions = await this.symbolExecutionModel
      .find({
        userAccountInfoId: (account as any)._id,
      })
      .select(
        '_id alertGroupId contractSize riskPercent stopDistancePips returnRatio useStopLoss useTakeProfit useTrailingStop useBreakEven atrPeriod atrMultiplier closeTradesOnWeekend isActive',
      )
      .lean()
      .exec();

    const groupIds = Array.from(
      new Set(
        (executions ?? [])
          .map((item: any) => String(item.alertGroupId))
          .filter(Boolean),
      ),
    );

    const groups = await this.getAlertGroupRowsByIds(groupIds);
    const groupMap = new Map(groups.map((group) => [group.groupId, group]));

    const filtered = (executions ?? []).filter((item: any) => {
      const group = groupMap.get(String(item.alertGroupId));

      if (!group) return false;

      if (symbolNorm && String(group.symbol).toUpperCase() !== symbolNorm) {
        return false;
      }

      if (tfNorm && String(group.timeFrame).toUpperCase() !== tfNorm) {
        return false;
      }

      return true;
    });

    const subscriptions = filtered.map((item: any) => {
      const group = groupMap.get(String(item.alertGroupId));

      const buyId = group?.actions?.find((a) => a.action === 'BUY')?.id;
      const sellId = group?.actions?.find((a) => a.action === 'SELL')?.id;

      return {
        id: String(item._id),
        alertGroupId: String(item.alertGroupId),

        symbol: String(group?.symbol ?? ''),
        timeFrame: String(group?.timeFrame ?? ''),

        buyId: buyId ? String(buyId) : undefined,
        sellId: sellId ? String(sellId) : undefined,

        contractSize: Number(item.contractSize ?? 0),
        riskPercent: Number(item.riskPercent ?? 0),

        useStopLoss: item.useStopLoss !== false,
        stopDistancePips: Number(item.stopDistancePips ?? 0),

        useTakeProfit: item.useTakeProfit !== false,
        returnRatio: Number(item.returnRatio ?? 0),

        useBreakEven: item.useBreakEven !== false,

        useTrailingStop: !!item.useTrailingStop,
        atrPeriod: Number(item.atrPeriod ?? 0),
        atrMultiplier: Number(item.atrMultiplier ?? 0),

        closeTradesOnWeekend: !!item.closeTradesOnWeekend,

        isActive: !!item.isActive,
      };
    });

    return {
      id: String((account as any)._id),
      accountRef: String((account as any).accountRef ?? ref),
      canTrade: !!(account as any).canTrade,
      isActive: (account as any).isActive !== false,

      useDrawdownLimit: !!(account as any).useDrawdownLimit,
      useProfitLimit: !!(account as any).useProfitLimit,
      maxDrawdownPercent: Number((account as any).maxDrawdownPercent ?? 0),
      maxProfitPercent: Number((account as any).maxProfitPercent ?? 0),

      platform: platformName || 'unknown',

      indicatorProjectId: String((account as any).indicatorProjectId),
      indicator: indicatorLabel || 'unknown',

      subscriptions,
    };
  }

  private async getAlertGroupRow(groupId: string): Promise<GroupRow | null> {
    const groupIds = await this.getAlertGroupRowsByIds([groupId]);
    return groupIds[0] ?? null;
  }

  private async getAlertGroupRowsByIds(
    groupIds: string[],
  ): Promise<GroupRow[]> {
    const ids = (groupIds ?? [])
      .map((item) => String(item ?? '').trim())
      .filter(Boolean);

    if (ids.length === 0) return [];

    const pipeline: any[] = [
      {
        $match: {
          groupId: {
            $in: ids,
          },
        },
      },
      {
        $lookup: {
          from: 'indicator_projects',
          localField: 'indicatorProjectId',
          foreignField: '_id',
          as: 'indicatorProject',
        },
      },
      {
        $unwind: {
          path: '$indicatorProject',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'indicators',
          localField: 'indicatorProject.indicatorId',
          foreignField: '_id',
          as: 'indicator',
        },
      },
      {
        $unwind: {
          path: '$indicator',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: '$groupId',
          groupId: {
            $first: '$groupId',
          },
          indicatorProjectId: {
            $first: '$indicatorProjectId',
          },
          symbol: {
            $first: '$symbol',
          },
          timeFrame: {
            $first: '$timeFrame',
          },
          anyActive: {
            $max: '$isActive',
          },
          actions: {
            $push: {
              id: {
                $toString: '$_id',
              },
              action: '$action',
              isActive: '$isActive',
            },
          },
          indicatorProject: {
            $first: '$indicatorProject',
          },
          indicator: {
            $first: '$indicator',
          },
        },
      },
      {
        $addFields: {
          isActive: '$anyActive',
        },
      },
      {
        $project: {
          _id: 0,
          groupId: 1,
          indicatorProjectId: {
            $toString: '$indicatorProjectId',
          },
          symbol: 1,
          timeFrame: 1,
          isActive: 1,
          actions: 1,
          indicatorProject: {
            $cond: [
              {
                $ifNull: ['$indicatorProject', false],
              },
              {
                id: {
                  $toString: '$indicatorProject._id',
                },
                indicator: {
                  $cond: [
                    {
                      $ifNull: ['$indicator', false],
                    },
                    {
                      id: {
                        $toString: '$indicator._id',
                      },
                      name: '$indicator.name',
                      key: '$indicator.key',
                      description: '$indicator.description',
                      isActive: '$indicator.isActive',
                    },
                    null,
                  ],
                },
              },
              null,
            ],
          },
        },
      },
    ];

    const rows = await this.alertModel.aggregate(pipeline).exec();

    return (rows ?? []) as GroupRow[];
  }

  private async assertIsClient(userId: Types.ObjectId) {
    const user = await this.userModel
      .findById(userId)
      .select('role')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if ((user as any).role !== UserRole.CLIENT) {
      throw new ForbiddenException('Only clients allowed');
    }
  }

  private async assertOwnershipByUserProjectPlatformId(
    userId: Types.ObjectId,
    userProjectPlatformId: any,
  ) {
    const id =
      typeof userProjectPlatformId === 'string'
        ? this.toObjectId(userProjectPlatformId)
        : userProjectPlatformId;

    const record = await this.userProjectPlatformModel
      .findOne({
        _id: id,
        userId,
      })
      .select('_id')
      .lean()
      .exec();

    if (!record) {
      throw new ForbiddenException('This record does not belong to you');
    }
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(String(id))) {
      throw new BadRequestException('Invalid id');
    }

    return new Types.ObjectId(String(id));
  }

  private assertNumber(value: any, field: string) {
    if (
      typeof value !== 'number' ||
      Number.isNaN(value) ||
      !Number.isFinite(value)
    ) {
      throw new BadRequestException(`${field} must be a valid number`);
    }
  }

  private buildCreatePayload(
    dto: CreateSymbolExecutionDto,
    userAccountInfoId: Types.ObjectId,
    alertGroupId: string,
  ) {
    const useStopLoss = dto.useStopLoss !== false;
    const useTakeProfit = dto.useTakeProfit !== false;

    const useTrailingStop = !!dto.useTrailingStop;
    const useBreakEven = dto.useBreakEven !== false;

    const closeTradesOnWeekend = !!dto.closeTradesOnWeekend;

    this.assertNumber(dto.contractSize, 'contractSize');
    this.assertNumber(dto.riskPercent, 'riskPercent');

    const stopDistancePips = useStopLoss ? dto.stopDistancePips : 0;
    const returnRatio = useTakeProfit ? dto.returnRatio : 0;

    const atrPeriod = useTrailingStop ? dto.atrPeriod : 0;
    const atrMultiplier = useTrailingStop ? dto.atrMultiplier : 0;

    if (useStopLoss) {
      this.assertNumber(stopDistancePips, 'stopDistancePips');
    }

    if (useTakeProfit) {
      this.assertNumber(returnRatio, 'returnRatio');
    }

    if (useTrailingStop) {
      this.assertNumber(atrPeriod, 'atrPeriod');
      this.assertNumber(atrMultiplier, 'atrMultiplier');
    }

    return {
      userAccountInfoId,
      alertGroupId,

      contractSize: dto.contractSize,
      riskPercent: dto.riskPercent,

      stopDistancePips,
      returnRatio,

      useStopLoss,
      useTakeProfit,
      useTrailingStop,
      useBreakEven,

      atrPeriod,
      atrMultiplier,

      closeTradesOnWeekend,

      isActive: dto.isActive !== false,
    };
  }

  private buildUpdatePayload(
    dto: UpdateSymbolExecutionDto,
    current: SymbolExecutionDocument,
  ) {
    const useStopLoss =
      typeof dto.useStopLoss === 'boolean'
        ? dto.useStopLoss
        : current.useStopLoss !== false;

    const useTakeProfit =
      typeof dto.useTakeProfit === 'boolean'
        ? dto.useTakeProfit
        : current.useTakeProfit !== false;

    const useTrailingStop =
      typeof dto.useTrailingStop === 'boolean'
        ? dto.useTrailingStop
        : !!current.useTrailingStop;

    const useBreakEven =
      typeof dto.useBreakEven === 'boolean'
        ? dto.useBreakEven
        : current.useBreakEven !== false;

    const closeTradesOnWeekend =
      typeof dto.closeTradesOnWeekend === 'boolean'
        ? dto.closeTradesOnWeekend
        : !!current.closeTradesOnWeekend;

    const contractSize =
      typeof dto.contractSize === 'number'
        ? dto.contractSize
        : current.contractSize;

    const riskPercent =
      typeof dto.riskPercent === 'number'
        ? dto.riskPercent
        : current.riskPercent;

    const stopDistancePips = useStopLoss
      ? typeof dto.stopDistancePips === 'number'
        ? dto.stopDistancePips
        : current.stopDistancePips
      : 0;

    const returnRatio = useTakeProfit
      ? typeof dto.returnRatio === 'number'
        ? dto.returnRatio
        : current.returnRatio
      : 0;

    const atrPeriod = useTrailingStop
      ? typeof dto.atrPeriod === 'number'
        ? dto.atrPeriod
        : current.atrPeriod
      : 0;

    const atrMultiplier = useTrailingStop
      ? typeof dto.atrMultiplier === 'number'
        ? dto.atrMultiplier
        : current.atrMultiplier
      : 0;

    this.assertNumber(contractSize, 'contractSize');
    this.assertNumber(riskPercent, 'riskPercent');

    if (useStopLoss) {
      this.assertNumber(stopDistancePips, 'stopDistancePips');
    }

    if (useTakeProfit) {
      this.assertNumber(returnRatio, 'returnRatio');
    }

    if (useTrailingStop) {
      this.assertNumber(atrPeriod, 'atrPeriod');
      this.assertNumber(atrMultiplier, 'atrMultiplier');
    }

    return {
      contractSize,
      riskPercent,

      stopDistancePips,
      returnRatio,

      useStopLoss,
      useTakeProfit,
      useTrailingStop,
      useBreakEven,

      atrPeriod,
      atrMultiplier,

      closeTradesOnWeekend,

      isActive:
        typeof dto.isActive === 'boolean' ? dto.isActive : current.isActive,
    };
  }
}