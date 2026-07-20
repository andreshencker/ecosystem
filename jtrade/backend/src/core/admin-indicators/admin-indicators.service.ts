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
  AdminIndicator,
  AdminIndicatorDocument,
} from './schemas/admin-indicator.schema';

import { CreateAdminIndicatorDto } from './dto/create-admin-indicator.dto';
import { UpdateAdminIndicatorDto } from './dto/update-admin-indicator.dto';

import { WebhookCryptoService } from '../../common/crypto/webhook-crypto.service';

import {
  IndicatorProject,
  IndicatorProjectDocument,
} from '../indicator-projects/schemas/indicator-project.schema';

import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

export type ValidateAdminIndicatorWebhookResult = {
  exists: boolean;
  ok: boolean;
  adminIndicatorId?: string;
  indicatorProjectId?: string;
  indicatorId?: string;
  projectCodePlatformId?: string;
  isActive?: boolean;
};

@Injectable()
export class AdminIndicatorsService {
  constructor(
    @InjectModel(AdminIndicator.name)
    private readonly model: Model<AdminIndicatorDocument>,

    @InjectModel(IndicatorProject.name)
    private readonly indicatorProjectModel: Model<IndicatorProjectDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly crypto: WebhookCryptoService,
  ) {}

  private readonly populateFull = [
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

  async listMine(providerUserId: Types.ObjectId) {
    await this.assertIsProvider(providerUserId);

    return this.model
      .find()
      .sort({ createdAt: -1 })
      .populate(this.populateFull as any)
      .lean()
      .exec();
  }

  async createMine(
    providerUserId: Types.ObjectId,
    dto: CreateAdminIndicatorDto,
  ) {
    await this.assertIsProvider(providerUserId);

    const indicatorProjectId = this.toObjectId(dto.indicatorProjectId);

    const indicatorProject = await this.indicatorProjectModel
      .findById(indicatorProjectId)
      .select('indicatorId projectCodePlatformId isActive')
      .lean()
      .exec();

    if (!indicatorProject) {
      throw new NotFoundException('Indicator project not found');
    }

    if ((indicatorProject as any).isActive === false) {
      throw new BadRequestException('Indicator project is inactive');
    }

    const webhookKey = this.crypto.generateWebhookKey();
    const secret = this.crypto.generateWebhookSecret();
    const enc = this.crypto.encrypt(secret);

    try {
      const created = await this.model.create({
        indicatorProjectId,
        webhookKey,
        webhookSecretEnc: enc.enc,
        webhookSecretIv: enc.iv,
        webhookSecretTag: enc.tag,
        isActive: true,
      });

      return this.model
        .findById(created._id)
        .populate(this.populateFull as any)
        .lean()
        .exec();
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException(
          'Admin indicator already exists for this indicator project',
        );
      }

      throw e;
    }
  }

  async getMineById(providerUserId: Types.ObjectId, id: string) {
    await this.assertIsProvider(providerUserId);

    const _id = this.toObjectId(id);

    const doc = await this.model
      .findById(_id)
      .populate(this.populateFull as any)
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException('Admin indicator not found');
    }

    return doc;
  }

  async updateMine(
    providerUserId: Types.ObjectId,
    id: string,
    dto: UpdateAdminIndicatorDto,
  ) {
    await this.assertIsProvider(providerUserId);

    const _id = this.toObjectId(id);

    const doc = await this.model.findById(_id).exec();

    if (!doc) {
      throw new NotFoundException('Admin indicator not found');
    }

    if (typeof dto.isActive === 'boolean') {
      doc.isActive = dto.isActive;
    }

    await doc.save();

    return this.model
      .findById(doc._id)
      .populate(this.populateFull as any)
      .lean()
      .exec();
  }

  async removeMine(providerUserId: Types.ObjectId, id: string) {
    await this.assertIsProvider(providerUserId);

    const _id = this.toObjectId(id);

    const res = await this.model.deleteOne({ _id }).exec();

    if (res.deletedCount === 0) {
      throw new NotFoundException('Admin indicator not found');
    }

    return { deleted: true };
  }

  async getWebhookKeyMine(providerUserId: Types.ObjectId, id: string) {
    await this.assertIsProvider(providerUserId);

    const _id = this.toObjectId(id);

    const doc = await this.model
      .findById(_id)
      .select('webhookKey')
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException('Admin indicator not found');
    }

    return {
      webhookKey: (doc as any).webhookKey,
    };
  }

  async revealWebhookSecretMine(providerUserId: Types.ObjectId, id: string) {
    await this.assertIsProvider(providerUserId);

    const _id = this.toObjectId(id);

    const doc = await this.model
      .findById(_id)
      .select('webhookKey webhookSecretEnc webhookSecretIv webhookSecretTag')
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException('Admin indicator not found');
    }

    const secret = this.crypto.decrypt({
      enc: (doc as any).webhookSecretEnc,
      iv: (doc as any).webhookSecretIv,
      tag: (doc as any).webhookSecretTag,
    });

    return {
      webhookKey: (doc as any).webhookKey,
      webhookSecret: secret,
    };
  }

  async rotateWebhookSecretMine(providerUserId: Types.ObjectId, id: string) {
    await this.assertIsProvider(providerUserId);

    const _id = this.toObjectId(id);

    const doc = await this.model
      .findById(_id)
      .select('webhookKey webhookSecretEnc webhookSecretIv webhookSecretTag')
      .exec();

    if (!doc) {
      throw new NotFoundException('Admin indicator not found');
    }

    const newSecret = this.crypto.generateWebhookSecret();
    const enc = this.crypto.encrypt(newSecret);

    doc.webhookSecretEnc = enc.enc;
    doc.webhookSecretIv = enc.iv;
    doc.webhookSecretTag = enc.tag;

    await doc.save();

    return {
      rotated: true,
      webhookKey: doc.webhookKey,
    };
  }

  async validateAdminIndicatorWebhook(
    webHookKey: string,
  ): Promise<ValidateAdminIndicatorWebhookResult> {
    if (!webHookKey || webHookKey.trim().length === 0) {
      return { exists: false, ok: false };
    }

    const ai = await this.model
      .findOne({
        webhookKey: webHookKey.trim(),
      })
      .select('_id indicatorProjectId isActive')
      .populate({
        path: 'indicatorProjectId',
        select: 'indicatorId projectCodePlatformId isActive',
      })
      .lean()
      .exec();

    if (!ai) {
      return { exists: false, ok: false };
    }

    const indicatorProject = (ai as any).indicatorProjectId;

    if (!(ai as any).isActive || indicatorProject?.isActive === false) {
      return {
        exists: true,
        ok: false,
        isActive: false,
        adminIndicatorId: String((ai as any)._id),
        indicatorProjectId: String(indicatorProject?._id ?? ''),
        indicatorId: String(indicatorProject?.indicatorId ?? ''),
        projectCodePlatformId: String(
          indicatorProject?.projectCodePlatformId ?? '',
        ),
      };
    }

    return {
      exists: true,
      ok: true,
      isActive: true,
      adminIndicatorId: String((ai as any)._id),
      indicatorProjectId: String(indicatorProject?._id ?? ''),
      indicatorId: String(indicatorProject?.indicatorId ?? ''),
      projectCodePlatformId: String(
        indicatorProject?.projectCodePlatformId ?? '',
      ),
    };
  }

  private async assertIsProvider(userId: Types.ObjectId) {
    const user = await this.userModel
      .findById(userId)
      .select('role')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if ((user as any).role !== UserRole.PROVIDER) {
      throw new ForbiddenException('Only providers allowed');
    }
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    return new Types.ObjectId(id);
  }
}
