import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import {
  UserPlatform,
  UserPlatformDocument,
  UserPlatformStatus,
} from './schemas/user-platform.schema';

import {
  Platform,
  PlatformDocument,
} from '../platforms/schemas/platform.schema';

@Injectable()
export class UserPlatformsService {
  private readonly platformPopulate = {
    path: 'platform',
    select: 'name category imageUrl isActive isSupported connectionType',
  };

  private readonly userPopulate = {
    path: 'user',
    select: 'firstName middleName lastName secondLastName email role avatarUrl',
  };

  constructor(
    @InjectModel(UserPlatform.name)
    private readonly model: Model<UserPlatformDocument>,

    @InjectModel(Platform.name)
    private readonly platformModel: Model<PlatformDocument>,
  ) {}

  // ==========================
  // CLIENT (mine)
  // ==========================
  async listMine(userId: Types.ObjectId) {
    return this.model
      .find(this.scope(userId))
      .sort({ isDefault: -1, createdAt: -1 })
      .populate(this.platformPopulate)
      .lean()
      .exec();
  }

  async createMine(
    userId: Types.ObjectId,
    platformId: string,
    isDefault?: boolean,
  ) {
    const pId = this.toObjectId(platformId);

    // ✅ CLIENT VALIDATION: exists + active + supported
    const platform = await this.platformModel
      .findById(pId)
      .select('isActive isSupported')
      .lean()
      .exec();

    if (!platform) throw new NotFoundException('Platform not found');
    if (!(platform as any).isActive)
      throw new BadRequestException('Platform is inactive');
    if (!(platform as any).isSupported)
      throw new BadRequestException('This platform is not supported yet');

    const existingCount = await this.model.countDocuments(this.scope(userId));
    const shouldBeDefault = existingCount === 0 || !!isDefault;

    let doc = await this.model.findOne(this.scope(userId, { platformId: pId }));

    if (!doc) {
      doc = new this.model({
        userId,
        platformId: pId,
        status: UserPlatformStatus.Pending,
        isActive: true,
        isDefault: shouldBeDefault,
      });

      try {
        await doc.save();
      } catch (e: any) {
        if (e?.code === 11000)
          throw new ConflictException('UserPlatform already exists');
        throw e;
      }
    } else if (shouldBeDefault && !doc.isDefault) {
      doc.isDefault = true;
      await doc.save();
    }

    if (doc.isDefault) {
      await this.clearOtherDefaults(userId, doc._id);
    }

    return this.model
      .findById(doc._id)
      .populate(this.platformPopulate)
      .lean()
      .exec();
  }

  async getMineById(userId: Types.ObjectId, id: string) {
    const _id = this.toObjectId(id);

    const doc = await this.model
      .findOne(this.scope(userId, { _id }))
      .populate(this.platformPopulate)
      .lean()
      .exec();

    if (!doc) throw new NotFoundException('UserPlatform not found');
    return doc;
  }

  async setDefaultMine(userId: Types.ObjectId, id: string) {
    const _id = this.toObjectId(id);

    const doc = await this.model.findOne(this.scope(userId, { _id })).exec();
    if (!doc) throw new NotFoundException('UserPlatform not found');

    if (!doc.isDefault) {
      doc.isDefault = true;
      await doc.save();
      await this.clearOtherDefaults(userId, doc._id);
    }

    return this.model
      .findById(doc._id)
      .populate(this.platformPopulate)
      .lean()
      .exec();
  }

  async changeStatusMine(
    userId: Types.ObjectId,
    id: string,
    status: UserPlatformStatus,
  ) {
    const _id = this.toObjectId(id);

    const doc = await this.model
      .findOne(this.scope(userId, { _id }))
      .populate({ path: 'platform', select: 'isActive isSupported' })
      .exec();

    if (!doc) throw new NotFoundException('UserPlatform not found');

    const platform = (doc as any)?.platform;
    if (status === UserPlatformStatus.Connected) {
      if (!platform) throw new BadRequestException('Platform not found');
      if (!platform.isActive)
        throw new BadRequestException('Platform is inactive');
      if (!platform.isSupported)
        throw new BadRequestException('This platform is not supported yet');
    }

    doc.status = status;
    await doc.save();

    return this.model
      .findById(doc._id)
      .populate(this.platformPopulate)
      .lean()
      .exec();
  }

  async updateMine(
    userId: Types.ObjectId,
    id: string,
    payload: Partial<Pick<UserPlatform, 'isActive' | 'isDefault'>>,
  ) {
    const _id = this.toObjectId(id);

    const doc = await this.model.findOne(this.scope(userId, { _id })).exec();
    if (!doc) throw new NotFoundException('UserPlatform not found');

    if (typeof payload.isActive === 'boolean') doc.isActive = payload.isActive;

    if (typeof payload.isDefault === 'boolean') {
      throw new BadRequestException(
        'Use setDefault endpoint to change default platform.',
      );
    }

    await doc.save();

    return this.model
      .findById(doc._id)
      .populate(this.platformPopulate)
      .lean()
      .exec();
  }

  async removeMine(userId: Types.ObjectId, id: string) {
    const _id = this.toObjectId(id);

    const doc = await this.model.findOne(this.scope(userId, { _id })).exec();
    if (!doc) throw new NotFoundException('UserPlatform not found');

    if (doc.isDefault) {
      const another = await this.model
        .findOne(this.scope(userId, { _id: { $ne: _id } }))
        .sort({ createdAt: 1 })
        .exec();

      if (another) {
        another.isDefault = true;
        await another.save();
        await this.clearOtherDefaults(userId, another._id);
      }
    }

    const res = await this.model.deleteOne(this.scope(userId, { _id })).exec();
    if (res.deletedCount === 0)
      throw new NotFoundException('UserPlatform not found');

    return { deleted: true };
  }

  // ==========================
  // ADMIN (global)
  // ==========================
  async listAll(params?: {
    userId?: string;
    platformId?: string;

    // Estos 2 filtros son de la asociación (user-platform)
    isActive?: boolean;

    // filtro opcional por role del usuario
    role?: 'admin' | 'client' | 'investor';
  }) {
    const filter: FilterQuery<UserPlatformDocument> = {};

    if (params?.userId) filter.userId = this.toObjectId(params.userId);
    if (params?.platformId)
      filter.platformId = this.toObjectId(params.platformId);
    if (typeof params?.isActive === 'boolean')
      filter.isActive = params.isActive;

    const q = this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .populate(this.platformPopulate);

    // ✅ populate user con match si role existe
    if (params?.role) {
      q.populate({
        ...(this.userPopulate as any),
        match: { role: params.role },
      });
    } else {
      q.populate(this.userPopulate);
    }

    const docs = await q.lean().exec();

    // match role => user=null cuando no coincide
    if (params?.role) return (docs ?? []).filter((d: any) => !!d.user);

    return docs;
  }

  /**
   * ✅ ADMIN CREATE
   * Reglas:
   *  - platform existe
   *  - platform isActive=true
   *  - platform isSupported=true
   *  - no status
   *  - no default
   */
  async adminCreate(payload: { userId: string; platformId: string }) {
    const userId = this.toObjectId(payload.userId);
    const platformId = this.toObjectId(payload.platformId);

    const platform = await this.platformModel
      .findById(platformId)
      .select('isActive isSupported')
      .lean()
      .exec();

    if (!platform) throw new NotFoundException('Platform not found');
    if (!(platform as any).isActive)
      throw new BadRequestException('Platform is inactive');
    if (!(platform as any).isSupported)
      throw new BadRequestException('This platform is not supported yet');

    let doc = await this.model.findOne({ userId, platformId }).exec();

    if (!doc) {
      doc = new this.model({
        userId,
        platformId,
        isActive: true,

        // ✅ admin invariants
        isDefault: false,
        status: undefined,
      });

      try {
        await doc.save();
      } catch (e: any) {
        if (e?.code === 11000)
          throw new ConflictException('UserPlatform already exists');
        throw e;
      }
    } else {
      // si ya existe, igual garantizamos invariantes admin
      doc.isDefault = false;
      (doc as any).status = undefined;
      await doc.save();
    }

    return this.model
      .findById(doc._id)
      .populate(this.platformPopulate)
      .populate(this.userPopulate)
      .lean()
      .exec();
  }

  /**
   * ✅ ADMIN UPDATE
   * Solo isActive, y si se quiere activar, re-validamos platform.
   */
  async adminUpdate(
    id: string,
    payload: Partial<Pick<UserPlatform, 'isActive'>>,
  ) {
    const _id = this.toObjectId(id);

    const doc = await this.model.findById(_id).exec();
    if (!doc) throw new NotFoundException('UserPlatform not found');

    if (typeof payload.isActive === 'boolean') {
      // si lo van a activar, validar platform activa + soportada
      if (payload.isActive === true) {
        const platform = await this.platformModel
          .findById(doc.platformId as any)
          .select('isActive isSupported')
          .lean()
          .exec();

        if (!platform) throw new NotFoundException('Platform not found');
        if (!(platform as any).isActive)
          throw new BadRequestException('Platform is inactive');
        if (!(platform as any).isSupported)
          throw new BadRequestException('This platform is not supported yet');
      }

      doc.isActive = payload.isActive;
    }

    // ✅ asegurar invariantes admin
    doc.isDefault = false;
    (doc as any).status = undefined;

    await doc.save();

    return this.model
      .findById(doc._id)
      .populate(this.platformPopulate)
      .populate(this.userPopulate)
      .lean()
      .exec();
  }

  // ==========================
  // Helpers
  // ==========================
  private scope(userId: Types.ObjectId, extra: FilterQuery<UserPlatform> = {}) {
    return { userId, ...extra };
  }

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    return new Types.ObjectId(id);
  }

  private async clearOtherDefaults(
    userId: Types.ObjectId,
    keepId: Types.ObjectId,
  ) {
    await this.model.updateMany(
      this.scope(userId, { _id: { $ne: keepId }, isDefault: true }),
      { $set: { isDefault: false } },
    );
  }
}
