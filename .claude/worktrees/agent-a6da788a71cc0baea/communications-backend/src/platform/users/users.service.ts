import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
  ) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<UserDocument | null> {
    return this.model.findById(id).select('-passwordHash').lean().exec() as any;
  }

  async findByIdOrThrow(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Returns the user WITH passwordHash — for login validation only.
   * Never pass the result of this method to an API response.
   */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.model
      .findOne({ email: email.toLowerCase().trim() })
      .lean()
      .exec() as any;
  }

  async findByEmailVerificationToken(
    tokenHash: string,
  ): Promise<UserDocument | null> {
    return this.model
      .findOne({
        emailVerificationToken: tokenHash,
        emailVerificationTokenExpiresAt: { $gt: new Date() },
      })
      .lean()
      .exec() as any;
  }

  async findByPasswordResetToken(
    tokenHash: string,
  ): Promise<UserDocument | null> {
    return this.model
      .findOne({
        passwordResetToken: tokenHash,
        passwordResetTokenExpiresAt: { $gt: new Date() },
      })
      .lean()
      .exec() as any;
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<UserDocument> {
    try {
      const created = await this.model.create({
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
      });
      return created.toObject() as any;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('An account with this email already exists');
      }
      throw err;
    }
  }

  async setEmailVerified(userId: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });
  }

  async setEmailVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: { emailVerificationToken: tokenHash, emailVerificationTokenExpiresAt: expiresAt },
    });
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: { passwordResetToken: tokenHash, passwordResetTokenExpiresAt: expiresAt },
    });
  }

  async setPasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $set: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });
  }

  async update(
    userId: string,
    data: { firstName?: string; lastName?: string },
  ): Promise<UserDocument> {
    const $set: any = {};
    if (data.firstName !== undefined) $set.firstName = data.firstName.trim();
    if (data.lastName !== undefined) $set.lastName = data.lastName.trim();

    const updated = await this.model
      .findByIdAndUpdate(userId, { $set }, { new: true })
      .select('-passwordHash')
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('User not found');
    return updated as any;
  }
}
