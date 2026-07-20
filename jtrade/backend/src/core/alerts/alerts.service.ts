import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';

import { Alert, AlertAction, AlertDocument } from './schemas/alert.schema';

import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { QueryAlertsDto } from './dto/query-alerts.dto';

import {
  IndicatorProject,
  IndicatorProjectDocument,
} from '../indicator-projects/schemas/indicator-project.schema';

import { Symbol, SymbolDocument } from '../symbols/schemas/symbol.schema';

type AlertGroupRow = {
  groupId: string;
  indicatorProjectId: string;
  symbolId: string;
  symbol: string;
  timeFrame: string;
  isActive: boolean;
  actions: {
    id: string;
    action: AlertAction;
    isActive: boolean;
  }[];
  symbolData?: any | null;
  indicatorProject?: any | null;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class AlertsService {
  private readonly populateFull = [
    {
      path: 'symbolId',
      select: 'companyProviderId symbol isActive',
    },
    {
      path: 'indicatorProjectId',
      select:
        'companyProviderId projectCodePlatformId indicatorId isActive notes',
      populate: [
        {
          path: 'indicatorId',
          select: 'name key description isActive',
        },
        {
          path: 'companyProviderId',
          select: 'companyName status isVerified isActive',
        },
        {
          path: 'projectCodePlatformId',
          select:
            'codeProjectId platformId deliveryMode runtimeMode status isActive',
          populate: [
            {
              path: 'codeProjectId',
              select: 'name projectKey isActive',
            },
            {
              path: 'platformId',
              select:
                'name category connectionType imageUrl isActive isSupported',
            },
          ],
        },
      ],
    },
  ];

  constructor(
    @InjectModel(Alert.name)
    private readonly model: Model<AlertDocument>,

    @InjectModel(IndicatorProject.name)
    private readonly indicatorProjectModel: Model<IndicatorProjectDocument>,

    @InjectModel(Symbol.name)
    private readonly symbolModel: Model<SymbolDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    return new Types.ObjectId(id);
  }

  private async getValidIndicatorProject(indicatorProjectId: Types.ObjectId) {
    const indicatorProject = await this.indicatorProjectModel
      .findById(indicatorProjectId)
      .select('_id companyProviderId isActive')
      .lean()
      .exec();

    if (!indicatorProject) {
      throw new NotFoundException('Indicator project not found');
    }

    if ((indicatorProject as any).isActive === false) {
      throw new BadRequestException('Indicator project is inactive');
    }

    return indicatorProject as any;
  }

  private async getValidSymbol(symbolId: Types.ObjectId) {
    const symbol = await this.symbolModel
      .findById(symbolId)
      .select('_id companyProviderId symbol isActive')
      .lean()
      .exec();

    if (!symbol) {
      throw new NotFoundException('Symbol not found');
    }

    if ((symbol as any).isActive === false) {
      throw new BadRequestException('Symbol is inactive');
    }

    return symbol as any;
  }

  async create(dto: CreateAlertDto) {
    const indicatorProjectId = this.toObjectId(dto.indicatorProjectId);
    const symbolId = this.toObjectId(dto.symbolId);

    const timeFrame = dto.timeframe.trim().toUpperCase();
    const isActive = dto.isActive ?? true;

    const indicatorProject =
      await this.getValidIndicatorProject(indicatorProjectId);

    const symbolDoc = await this.getValidSymbol(symbolId);

    if (
      String(indicatorProject.companyProviderId) !==
      String(symbolDoc.companyProviderId)
    ) {
      throw new BadRequestException(
        'Symbol does not belong to the same company provider as the indicator project',
      );
    }

    const symbol = String(symbolDoc.symbol).trim().toUpperCase();

    const existing = await this.model
      .findOne({
        indicatorProjectId,
        symbolId,
        timeFrame,
      })
      .lean()
      .exec();

    if (existing) {
      throw new ConflictException(
        'Alert group already exists for this indicator project/symbol/timeframe',
      );
    }

    const groupId = randomUUID();

    await this.model.insertMany([
      {
        indicatorProjectId,
        symbolId,
        groupId,
        symbol,
        timeFrame,
        action: AlertAction.BUY,
        isActive,
      },
      {
        indicatorProjectId,
        symbolId,
        groupId,
        symbol,
        timeFrame,
        action: AlertAction.SELL,
        isActive,
      },
    ]);

    return this.model
      .find({ groupId })
      .sort({ createdAt: -1 })
      .populate(this.populateFull as any)
      .lean()
      .exec();
  }

  async list(query: QueryAlertsDto) {
    const filter: FilterQuery<Alert> = {};

    if (query.indicatorProjectId) {
      filter.indicatorProjectId = this.toObjectId(query.indicatorProjectId);
    }

    if (query.symbolId) {
      filter.symbolId = this.toObjectId(query.symbolId);
    }

    if (query.symbol) {
      filter.symbol = query.symbol.trim().toUpperCase();
    }

    if (query.timeFrame) {
      filter.timeFrame = query.timeFrame.trim().toUpperCase();
    }

    if (query.groupId) {
      filter.groupId = query.groupId;
    }

    if (query.action) {
      const act = query.action.toUpperCase();

      if (act !== AlertAction.BUY && act !== AlertAction.SELL) {
        throw new BadRequestException('Invalid action');
      }

      filter.action = act as AlertAction;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    return this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .populate(this.populateFull as any)
      .lean()
      .exec();
  }

  async listGroups(query: QueryAlertsDto): Promise<AlertGroupRow[]> {
    const filter: FilterQuery<Alert> = {};

    if (query.indicatorProjectId) {
      filter.indicatorProjectId = this.toObjectId(query.indicatorProjectId);
    }

    if (query.symbolId) {
      filter.symbolId = this.toObjectId(query.symbolId);
    }

    if (query.symbol) {
      filter.symbol = query.symbol.trim().toUpperCase();
    }

    if (query.timeFrame) {
      filter.timeFrame = query.timeFrame.trim().toUpperCase();
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    const docs = await this.model
      .find(filter)
      .sort({ updatedAt: -1 })
      .populate(this.populateFull as any)
      .lean()
      .exec();

    const map = new Map<string, any[]>();

    for (const doc of docs) {
      const groupId = String((doc as any).groupId);

      if (!map.has(groupId)) {
        map.set(groupId, []);
      }

      map.get(groupId)!.push(doc);
    }

    return Array.from(map.values()).map((items) => {
      const first: any = items[0];

      return {
        groupId: String(first.groupId),
        indicatorProjectId: String(
          first.indicatorProjectId?._id ?? first.indicatorProjectId,
        ),
        symbolId: String(first.symbolId?._id ?? first.symbolId),
        symbol: first.symbol,
        timeFrame: first.timeFrame,
        isActive: items.some((item: any) => item.isActive === true),

        symbolData:
          first.symbolId && typeof first.symbolId === 'object'
            ? first.symbolId
            : null,

        indicatorProject:
          first.indicatorProjectId &&
          typeof first.indicatorProjectId === 'object'
            ? first.indicatorProjectId
            : null,

        actions: items.map((item: any) => ({
          id: String(item._id),
          action: item.action,
          isActive: item.isActive,
        })),

        createdAt: items.reduce(
          (min: Date | undefined, item: any) =>
            !min || item.createdAt < min ? item.createdAt : min,
          undefined,
        ),

        updatedAt: items.reduce(
          (max: Date | undefined, item: any) =>
            !max || item.updatedAt > max ? item.updatedAt : max,
          undefined,
        ),
      };
    });
  }

  async getById(id: string) {
    const objId = this.toObjectId(id);

    const alert = await this.model
      .findById(objId)
      .populate(this.populateFull as any)
      .lean()
      .exec();

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }

  async update(id: string, dto: UpdateAlertDto) {
    const objId = this.toObjectId(id);

    const alert = await this.model.findById(objId).lean().exec();

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const updateData: any = {};

    if (dto.symbolId) {
      const symbolId = this.toObjectId(dto.symbolId);
      const symbolDoc = await this.getValidSymbol(symbolId);

      const indicatorProject = await this.getValidIndicatorProject(
        alert.indicatorProjectId,
      );

      if (
        String(indicatorProject.companyProviderId) !==
        String(symbolDoc.companyProviderId)
      ) {
        throw new BadRequestException(
          'Symbol does not belong to the same company provider as the indicator project',
        );
      }

      updateData.symbolId = symbolId;
      updateData.symbol = String(symbolDoc.symbol).trim().toUpperCase();
    }

    if (dto.timeframe) {
      updateData.timeFrame = dto.timeframe.trim().toUpperCase();
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    await this.model
      .updateMany(
        {
          groupId: alert.groupId,
        },
        {
          $set: updateData,
        },
      )
      .exec();

    return this.model
      .find({
        groupId: alert.groupId,
      })
      .sort({ createdAt: -1 })
      .populate(this.populateFull as any)
      .lean()
      .exec();
  }

  async remove(id: string) {
    const objId = this.toObjectId(id);

    const alert = await this.model.findById(objId).lean().exec();

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    await this.model
      .deleteMany({
        groupId: alert.groupId,
      })
      .exec();

    return {
      deleted: true,
    };
  }
}
