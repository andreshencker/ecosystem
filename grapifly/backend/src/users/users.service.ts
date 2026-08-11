import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { GrapiflyUser, GrapiflyUserDocument } from './schemas/user.schema';

export interface GoogleIdentity {
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(GrapiflyUser.name)
    private readonly users: Model<GrapiflyUserDocument>,
  ) {}

  async upsertGoogleIdentity(identity: GoogleIdentity) {
    return this.users.findOneAndUpdate(
      { provider: 'google', providerSubject: identity.subject },
      {
        $set: {
          email: identity.email.toLowerCase(),
          emailVerified: identity.emailVerified,
          displayName: identity.displayName,
          avatarUrl: identity.avatarUrl,
          lastLoginAt: new Date(),
        },
        $setOnInsert: {
          grapiflyUserId: `gpf_usr_${randomUUID().replaceAll('-', '')}`,
          provider: 'google',
          providerSubject: identity.subject,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    ).lean();
  }

  findByGrapiflyUserId(grapiflyUserId: string) {
    return this.users.findOne({ grapiflyUserId, isActive: true }).lean();
  }
}
