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
  UserAccountInfo,
  UserAccountInfoDocument,
} from './schemas/user-account-info.schema';

import {
  UserProjectPlatform,
  UserProjectPlatformDocument,
} from '../user-project-platform/schemas/user-project-platform.schema';

import {
  IndicatorProject,
  IndicatorProjectDocument,
} from '../indicator-projects/schemas/indicator-project.schema';

import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

import {
  SymbolExecution,
  SymbolExecutionDocument,
} from '../symbol-executions/schemas/symbol-execution.schema';

import { CreateUserAccountInfoDto } from './dto/create-user-account-info.dto';
import { UpdateUserAccountInfoDto } from './dto/update-user-account-info.dto';

@Injectable()
export class UserAccountInfoService {
  private readonly populate = [
    {
      path: 'userProjectPlatform',
      select:
          'userId projectCodePlatformId isActive subscribedAt lastDownloadAt',
      populate: {
        path: 'projectCodePlatform',
        select:
            'codeProjectId platformId deliveryMode runtimeMode status isActive',
        populate: [
          {
            path: 'codeProject',
            select: 'name projectKey isActive',
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
          'companyProviderId projectCodePlatformId indicatorId isActive notes',
      populate: [
        {
          path: 'indicator',
          select: 'name key description isActive',
        },
        {
          path: 'companyProvider',
          select: 'companyName status isVerified isActive',
        },
        {
          path: 'projectCodePlatform',
          select:
              'codeProjectId platformId deliveryMode runtimeMode status isActive',
          populate: [
            {
              path: 'codeProject',
              select: 'name projectKey isActive',
            },
            {
              path: 'platform',
              select:
                  'name category connectionType imageUrl isActive isSupported',
            },
          ],
        },
      ],
    },
  ];

  constructor(
      @InjectModel(UserAccountInfo.name)
      private readonly model: Model<UserAccountInfoDocument>,

      @InjectModel(UserProjectPlatform.name)
      private readonly userProjectPlatformModel: Model<UserProjectPlatformDocument>,

      @InjectModel(IndicatorProject.name)
      private readonly indicatorProjectModel: Model<IndicatorProjectDocument>,

      @InjectModel(User.name)
      private readonly userModel: Model<UserDocument>,

      @InjectModel(SymbolExecution.name)
      private readonly symbolExecutionModel: Model<SymbolExecutionDocument>,
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

    return this.model
        .find({
          userProjectPlatformId: {
            $in: userProjectPlatformIds,
          },
        })
        .sort({ createdAt: -1 })
        .populate(this.populate as any)
        .lean()
        .exec();
  }

  async createMine(userId: Types.ObjectId, dto: CreateUserAccountInfoDto) {
    await this.assertIsClient(userId);

    const userProjectPlatformId = this.toObjectId(dto.userProjectPlatformId);

    const indicatorProjectId = dto.indicatorProjectId
        ? this.toObjectId(dto.indicatorProjectId)
        : undefined;

    const accountRef =
        typeof dto.accountRef === 'string' ? dto.accountRef.trim() : '';

    const accountLabel =
        typeof dto.accountLabel === 'string' ? dto.accountLabel.trim() : '';

    const userProjectPlatform = await this.userProjectPlatformModel
        .findOne({
          _id: userProjectPlatformId,
          userId,
        })
        .populate({
          path: 'projectCodePlatform',
          select:
              'codeProjectId platformId deliveryMode runtimeMode status isActive',
          populate: [
            {
              path: 'codeProject',
              select: 'name projectKey typeProjectId isActive',
              populate: {
                path: 'typeProject',
                select: 'key name isActive',
              },
            },
            {
              path: 'platform',
              select: 'name isActive isSupported',
            },
          ],
        })
        .lean()
        .exec();

    if (!userProjectPlatform) {
      throw new NotFoundException(
          'UserProjectPlatform not found for this client',
      );
    }

    if ((userProjectPlatform as any).isActive === false) {
      throw new BadRequestException('UserProjectPlatform is inactive');
    }

    const typeProjectKey = String(
        (userProjectPlatform as any)?.projectCodePlatform?.codeProject
            ?.typeProject?.key ?? '',
    )
        .toLowerCase()
        .trim();

    const typeProjectName = String(
        (userProjectPlatform as any)?.projectCodePlatform?.codeProject
            ?.typeProject?.name ?? '',
    )
        .toLowerCase()
        .trim();

    const isIndicatorProject =
        typeProjectKey === 'indicator' || typeProjectName === 'indicator';

    let indicatorProject: any = null;

    if (isIndicatorProject) {
      if (!indicatorProjectId) {
        throw new BadRequestException(
            'indicatorProjectId is required for indicator projects',
        );
      }

      indicatorProject = await this.indicatorProjectModel
          .findById(indicatorProjectId)
          .populate({
            path: 'indicator',
            select: 'name key isActive',
          })
          .populate({
            path: 'projectCodePlatform',
            select:
                'codeProjectId platformId deliveryMode runtimeMode status isActive',
            populate: {
              path: 'platform',
              select: 'name isActive isSupported',
            },
          })
          .lean()
          .exec();

      if (!indicatorProject) {
        throw new NotFoundException('IndicatorProject not found');
      }

      if (indicatorProject.isActive === false) {
        throw new BadRequestException('IndicatorProject is inactive');
      }

      this.assertSameProjectCodePlatform(
          (userProjectPlatform as any).projectCodePlatformId,
          indicatorProject.projectCodePlatformId,
      );
    }

    const platformName = String(
        (userProjectPlatform as any)?.projectCodePlatform?.platform?.name ?? '',
    ).toLowerCase();

    const canTrade = !!dto.canTrade;

    if (platformName === 'mt5' && canTrade && !accountRef) {
      throw new BadRequestException(
          'accountRef is required for MT5 when canTrade=true',
      );
    }

    const useDrawdownLimit = !!dto.useDrawdownLimit;
    const useProfitLimit = !!dto.useProfitLimit;

    const maxDrawdownPercent = useDrawdownLimit
        ? dto.maxDrawdownPercent
        : 0;

    const maxProfitPercent = useProfitLimit ? dto.maxProfitPercent : 0;

    if (useDrawdownLimit) {
      this.assertNumber(maxDrawdownPercent, 'maxDrawdownPercent');
    }

    if (useProfitLimit) {
      this.assertNumber(maxProfitPercent, 'maxProfitPercent');
    }

    const duplicateFilter: any = {
      userProjectPlatformId,
      accountRef,
    };

    if (indicatorProjectId) {
      duplicateFilter.indicatorProjectId = { $ne: indicatorProjectId };
    }

    if (accountRef) {
      const existingByAccountRef = await this.model
          .findOne(duplicateFilter)
          .select('_id indicatorProjectId')
          .lean()
          .exec();

      if (existingByAccountRef) {
        throw new ConflictException(
            'This accountRef is already linked to another account for this user project platform',
        );
      }
    }

    try {
      const payload: any = {
        userProjectPlatformId,
        accountRef: accountRef || null,
        accountLabel: accountLabel || null,
        canTrade,
        useDrawdownLimit,
        useProfitLimit,
        maxDrawdownPercent,
        maxProfitPercent,
        isActive: true,
      };

      if (indicatorProjectId) {
        payload.indicatorProjectId = indicatorProjectId;
      }

      const created = await this.model.create(payload);

      return this.model
          .findById(created._id)
          .populate(this.populate as any)
          .lean()
          .exec();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
            'UserAccountInfo already exists for this project/account configuration',
        );
      }

      throw error;
    }
  }

  async getMineById(userId: Types.ObjectId, id: string) {
    await this.assertIsClient(userId);

    const _id = this.toObjectId(id);

    const doc = await this.model
        .findById(_id)
        .populate(this.populate as any)
        .lean()
        .exec();

    if (!doc) {
      throw new NotFoundException('UserAccountInfo not found');
    }

    await this.assertOwnership(userId, (doc as any).userProjectPlatformId);

    return doc;
  }

  async updateMine(
      userId: Types.ObjectId,
      id: string,
      dto: UpdateUserAccountInfoDto,
  ) {
    await this.assertIsClient(userId);

    const _id = this.toObjectId(id);

    const doc = await this.model.findById(_id).exec();

    if (!doc) {
      throw new NotFoundException('UserAccountInfo not found');
    }

    await this.assertOwnership(userId, doc.userProjectPlatformId);

    const userProjectPlatform = await this.userProjectPlatformModel
        .findById(doc.userProjectPlatformId)
        .populate({
          path: 'projectCodePlatform',
          select:
              'codeProjectId platformId deliveryMode runtimeMode status isActive',
          populate: {
            path: 'platform',
            select: 'name isActive isSupported',
          },
        })
        .lean()
        .exec();

    if (!userProjectPlatform) {
      throw new NotFoundException('UserProjectPlatform not found');
    }

    if ((userProjectPlatform as any).isActive === false) {
      throw new BadRequestException('UserProjectPlatform is inactive');
    }

    const platformName = String(
        (userProjectPlatform as any)?.projectCodePlatform?.platform?.name ?? '',
    ).toLowerCase();

    if (typeof dto.accountRef === 'string') {
      const trimmed = dto.accountRef.trim();
      doc.accountRef = trimmed ? trimmed : null;
    }

    if (typeof dto.accountLabel === 'string') {
      const trimmed = dto.accountLabel.trim();
      doc.accountLabel = trimmed ? trimmed : null;
    }

    if (typeof dto.canTrade === 'boolean') {
      doc.canTrade = dto.canTrade;
    }

    if (typeof dto.useDrawdownLimit === 'boolean') {
      doc.useDrawdownLimit = dto.useDrawdownLimit;
    }

    if (typeof dto.useProfitLimit === 'boolean') {
      doc.useProfitLimit = dto.useProfitLimit;
    }

    if (typeof dto.maxDrawdownPercent === 'number') {
      doc.maxDrawdownPercent = dto.maxDrawdownPercent;
    }

    if (typeof dto.maxProfitPercent === 'number') {
      doc.maxProfitPercent = dto.maxProfitPercent;
    }

    if (doc.useDrawdownLimit === false) {
      doc.maxDrawdownPercent = 0;
    } else {
      this.assertNumber(doc.maxDrawdownPercent, 'maxDrawdownPercent');
    }

    if (doc.useProfitLimit === false) {
      doc.maxProfitPercent = 0;
    } else {
      this.assertNumber(doc.maxProfitPercent, 'maxProfitPercent');
    }

    if (typeof dto.isActive === 'boolean') {
      doc.isActive = dto.isActive;
    }

    if (platformName === 'mt5' && doc.canTrade === true) {
      if (!doc.accountRef || doc.accountRef.trim().length === 0) {
        throw new BadRequestException(
            'accountRef is required for MT5 when canTrade=true',
        );
      }
    }

    if (doc.accountRef && doc.accountRef.trim().length > 0) {
      const duplicated = await this.model
          .findOne({
            _id: {
              $ne: doc._id,
            },
            userProjectPlatformId: doc.userProjectPlatformId,
            accountRef: doc.accountRef.trim(),
            indicatorProjectId: {
              $ne: doc.indicatorProjectId,
            },
          })
          .select('_id')
          .lean()
          .exec();

      if (duplicated) {
        throw new ConflictException(
            'This accountRef is already linked to another indicator project for this user project platform',
        );
      }
    }

    await doc.save();

    return this.model
        .findById(doc._id)
        .populate(this.populate as any)
        .lean()
        .exec();
  }

  async removeMine(userId: Types.ObjectId, id: string) {
    await this.assertIsClient(userId);

    const _id = this.toObjectId(id);

    const doc = await this.model
        .findById(_id)
        .select('userProjectPlatformId')
        .lean()
        .exec();

    if (!doc) {
      throw new NotFoundException('UserAccountInfo not found');
    }

    await this.assertOwnership(userId, (doc as any).userProjectPlatformId);

    const deletedSymbolExecutions = await this.symbolExecutionModel
        .deleteMany({
          userAccountInfoId: _id,
        })
        .exec();

    const result = await this.model.deleteOne({ _id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('UserAccountInfo not found');
    }

    return {
      deleted: true,
      deletedSymbolExecutions: deletedSymbolExecutions.deletedCount ?? 0,
    };
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

  private async assertOwnership(
      userId: Types.ObjectId,
      userProjectPlatformId: Types.ObjectId,
  ) {
    const exists = await this.userProjectPlatformModel
        .findOne({
          _id: userProjectPlatformId,
          userId,
        })
        .select('_id')
        .lean()
        .exec();

    if (!exists) {
      throw new ForbiddenException('This record does not belong to you');
    }
  }

  private assertSameProjectCodePlatform(
      userProjectPlatformProjectCodePlatformId: any,
      indicatorProjectProjectCodePlatformId: any,
  ) {
    const left = String(
        userProjectPlatformProjectCodePlatformId?._id ??
        userProjectPlatformProjectCodePlatformId,
    );

    const right = String(
        indicatorProjectProjectCodePlatformId?._id ??
        indicatorProjectProjectCodePlatformId,
    );

    if (!left || !right || left !== right) {
      throw new BadRequestException(
          'UserProjectPlatform and IndicatorProject must belong to the same ProjectCodePlatform',
      );
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
}