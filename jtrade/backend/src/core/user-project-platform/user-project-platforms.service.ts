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
  UserProjectPlatform,
  UserProjectPlatformDocument,
} from './schemas/user-project-platform.schema';

import {
  ProjectCodePlatform,
  ProjectCodePlatformDocument,
} from '../project-code-platform/schemas/project-code-platform.schema';

import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

import { CreateUserProjectPlatformDto } from './dto/create-user-project-platform.dto';
import { UpdateUserProjectPlatformDto } from './dto/update-user-project-platform.dto';

@Injectable()
export class UserProjectPlatformsService {
  private readonly populate = [
    {
      path: 'userId',
      select:
        'firstName middleName lastName secondLastName email role avatarUrl',
    },
    {
      path: 'projectCodePlatformId',
      select:
        'codeProjectId platformId deliveryMode runtimeMode status isActive notes',
      populate: [
        {
          path: 'codeProjectId',
          select:
            'projectKey name description companyProviderId typeProjectId isActive',
          populate: [
            {
              path: 'companyProviderId',
              select: 'companyName legalName logoUrl isActive',
            },
            {
              path: 'typeProjectId',
              select: 'key name isActive',
            },
          ],
        },
        {
          path: 'platformId',
          select: 'name category connectionType imageUrl isActive isSupported',
        },
      ],
    },
  ];

  constructor(
    @InjectModel(UserProjectPlatform.name)
    private readonly model: Model<UserProjectPlatformDocument>,

    @InjectModel(ProjectCodePlatform.name)
    private readonly projectCodePlatformModel: Model<ProjectCodePlatformDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async listMine(userId: string): Promise<any[]> {
    const userObjectId = await this.assertClientUser(userId);

    return this.model
      .find({
        userId: userObjectId,
      })
      .sort({
        createdAt: -1,
      })
      .populate(this.populate as any)
      .lean()
      .exec();
  }

  async createMine(
    userId: string,
    dto: CreateUserProjectPlatformDto,
  ): Promise<any> {
    const userObjectId = await this.assertClientUser(userId);

    const projectCodePlatformId = this.toObjectId(
      dto.projectCodePlatformId,
      'projectCodePlatformId',
    );

    const projectCodePlatform = await this.projectCodePlatformModel
      .findById(projectCodePlatformId)
      .populate([
        {
          path: 'codeProjectId',
          select: 'projectKey name companyProviderId typeProjectId isActive',
          populate: [
            {
              path: 'companyProviderId',
              select: 'companyName isActive',
            },
            {
              path: 'typeProjectId',
              select: 'key name isActive',
            },
          ],
        },
        {
          path: 'platformId',
          select: 'name imageUrl isActive isSupported',
        },
      ])
      .lean()
      .exec();

    if (!projectCodePlatform) {
      throw new NotFoundException('Project platform not found');
    }

    if ((projectCodePlatform as any).isActive === false) {
      throw new BadRequestException('Project platform is inactive');
    }

    if ((projectCodePlatform as any).codeProjectId?.isActive === false) {
      throw new BadRequestException('Code project is inactive');
    }

    if (
      (projectCodePlatform as any).codeProjectId?.companyProviderId
        ?.isActive === false
    ) {
      throw new BadRequestException('Provider company is inactive');
    }

    if (
      (projectCodePlatform as any).codeProjectId?.typeProjectId?.isActive ===
      false
    ) {
      throw new BadRequestException('Project type is inactive');
    }

    if ((projectCodePlatform as any).platformId?.isActive === false) {
      throw new BadRequestException('Platform is inactive');
    }

    if ((projectCodePlatform as any).platformId?.isSupported !== true) {
      throw new BadRequestException('Platform is not supported');
    }

    try {
      const existing = await this.model
        .findOne({
          userId: userObjectId,
          projectCodePlatformId,
        })
        .exec();

      if (existing) {
        if (existing.isActive === false) {
          existing.isActive = true;
          existing.subscribedAt = existing.subscribedAt ?? new Date();

          await existing.save();

          return this.model
            .findById(existing._id)
            .populate(this.populate as any)
            .lean()
            .exec();
        }

        throw new ConflictException(
          'You are already subscribed to this project',
        );
      }

      const created = await this.model.create({
        userId: userObjectId,
        projectCodePlatformId,
        isActive: true,
        subscribedAt: new Date(),
        lastDownloadAt: null,
      });

      return this.model
        .findById(created._id)
        .populate(this.populate as any)
        .lean()
        .exec();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          'You are already subscribed to this project',
        );
      }

      throw error;
    }
  }

  async findMineById(userId: string, id: string): Promise<any> {
    const userObjectId = await this.assertClientUser(userId);
    const _id = this.toObjectId(id, 'id');

    const doc = await this.model
      .findOne({
        _id,
        userId: userObjectId,
      })
      .populate(this.populate as any)
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException('User project platform not found');
    }

    return doc;
  }

  async updateMine(
    userId: string,
    id: string,
    dto: UpdateUserProjectPlatformDto,
  ): Promise<any> {
    const userObjectId = await this.assertClientUser(userId);
    const _id = this.toObjectId(id, 'id');

    const update: any = {};

    if (typeof dto.isActive === 'boolean') {
      update.isActive = dto.isActive;
    }

    const updated = await this.model
      .findOneAndUpdate(
        {
          _id,
          userId: userObjectId,
        },
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .populate(this.populate as any)
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('User project platform not found');
    }

    return updated;
  }

  async removeMine(userId: string, id: string): Promise<{ deleted: boolean }> {
    const userObjectId = await this.assertClientUser(userId);
    const _id = this.toObjectId(id, 'id');

    const result = await this.model
      .deleteOne({
        _id,
        userId: userObjectId,
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('User project platform not found');
    }

    return {
      deleted: true,
    };
  }

  async markDownloaded(
    userId: string,
    id: string,
  ): Promise<{ updated: boolean }> {
    const userObjectId = await this.assertClientUser(userId);
    const _id = this.toObjectId(id, 'id');

    const updated = await this.model.findOneAndUpdate(
      {
        _id,
        userId: userObjectId,
        isActive: true,
      },
      {
        $set: {
          lastDownloadAt: new Date(),
        },
      },
      {
        new: true,
      },
    );

    if (!updated) {
      throw new NotFoundException('Active subscription not found');
    }

    return {
      updated: true,
    };
  }

  async listAll(params?: {
    userId?: string;
    projectCodePlatformId?: string;
    isActive?: boolean;
  }): Promise<any[]> {
    const filter: any = {};

    if (params?.userId) {
      filter.userId = this.toObjectId(params.userId, 'userId');
    }

    if (params?.projectCodePlatformId) {
      filter.projectCodePlatformId = this.toObjectId(
        params.projectCodePlatformId,
        'projectCodePlatformId',
      );
    }

    if (typeof params?.isActive === 'boolean') {
      filter.isActive = params.isActive;
    }

    return this.model
      .find(filter)
      .sort({
        createdAt: -1,
      })
      .populate(this.populate as any)
      .lean()
      .exec();
  }

  async adminUpdate(
    id: string,
    dto: UpdateUserProjectPlatformDto,
  ): Promise<any> {
    const _id = this.toObjectId(id, 'id');

    const update: any = {};

    if (typeof dto.isActive === 'boolean') {
      update.isActive = dto.isActive;
    }

    const updated = await this.model
      .findByIdAndUpdate(
        _id,
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .populate(this.populate as any)
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('User project platform not found');
    }

    return updated;
  }

  async adminRemove(id: string): Promise<{ deleted: boolean }> {
    const _id = this.toObjectId(id, 'id');

    const result = await this.model.deleteOne({ _id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('User project platform not found');
    }

    return {
      deleted: true,
    };
  }

  private async assertClientUser(userId: string): Promise<Types.ObjectId> {
    const userObjectId = this.toObjectId(userId, 'userId');

    const user = await this.userModel
      .findById(userObjectId)
      .select('role isActive')
      .lean()
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if ((user as any).isActive === false) {
      throw new ForbiddenException('User is inactive');
    }

    if ((user as any).role !== UserRole.CLIENT) {
      throw new ForbiddenException('Only clients can subscribe to projects');
    }

    return userObjectId;
  }

  private toObjectId(id: string, fieldName: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(String(id))) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }

    return new Types.ObjectId(String(id));
  }
}
