import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { OrganizationsService } from '../organizations/organizations.service';
import { CommunicationToken, CommunicationTokenDocument } from './schemas/communication-token.schema';
import { CommunicationTokenResponseDto, toCommunicationTokenResponse } from './dto/communication-token-response.dto';
import { CreateCommunicationTokenDto } from './dto/create-communication-token.dto';
import { CreateCommunicationTokenResponseDto } from './dto/create-communication-token-response.dto';
import { ValidateCommunicationTokenResponseDto } from './dto/validate-communication-token.dto';
import { DeleteCommunicationTokenResponseDto } from './dto/delete-communication-token-response.dto';

@Injectable()
export class CommunicationTokensService {
  constructor(
    @InjectModel(CommunicationToken.name) private readonly tokens: Model<CommunicationTokenDocument>,
    private readonly organizations: OrganizationsService,
  ) {}

  async createForOrganization(
    grapiflyUserId: string,
    organizationId: string,
    dto: CreateCommunicationTokenDto,
  ): Promise<CreateCommunicationTokenResponseDto> {
    await this.organizations.requireManager(grapiflyUserId, organizationId);
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('name is required');

    const token = `gpf_comm_${randomBytes(24).toString('hex')}`;
    const tokenHash = this.hashToken(token);
    const tokenPrefix = token.slice(0, 'gpf_comm_'.length + 8);

    const created = await this.tokens.create({
      tokenId: `gpf_ctok_${randomUUID().replaceAll('-', '')}`,
      organizationId,
      name,
      description: dto.description?.trim() ?? '',
      tokenHash,
      tokenPrefix,
      status: 'active',
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: grapiflyUserId,
    });

    return { ...toCommunicationTokenResponse(created), token };
  }

  async listForOrganization(grapiflyUserId: string, organizationId: string): Promise<CommunicationTokenResponseDto[]> {
    await this.organizations.requireManager(grapiflyUserId, organizationId);
    const entries = await this.tokens.find({ organizationId }).sort({ createdAt: -1 }).lean();
    return entries.map(toCommunicationTokenResponse);
  }

  async revoke(grapiflyUserId: string, organizationId: string, tokenId: string): Promise<CommunicationTokenResponseDto> {
    await this.organizations.requireManager(grapiflyUserId, organizationId);
    const updated = await this.tokens.findOneAndUpdate(
      { tokenId, organizationId },
      { $set: { status: 'revoked' } },
      { returnDocument: 'after' },
    ).lean();
    if (!updated) throw new NotFoundException('Communication token not found');
    return toCommunicationTokenResponse(updated);
  }

  async remove(grapiflyUserId: string, organizationId: string, tokenId: string): Promise<DeleteCommunicationTokenResponseDto> {
    await this.organizations.requireManager(grapiflyUserId, organizationId);
    const deleted = await this.tokens.findOneAndDelete({ tokenId, organizationId }).lean();
    if (!deleted) throw new NotFoundException('Communication token not found');
    return { tokenId, deleted: true };
  }

  /** Called by other apps (e.g. Relay) to verify a token presented by an external caller. */
  async validate(rawToken: string): Promise<ValidateCommunicationTokenResponseDto> {
    const token = rawToken?.trim();
    if (!token) throw new UnauthorizedException('Invalid communication token');
    const tokenHash = this.hashToken(token);
    const entry = await this.tokens.findOne({ tokenHash }).select('+tokenHash').lean();
    if (!entry) throw new UnauthorizedException('Invalid communication token');
    if (entry.status !== 'active') throw new UnauthorizedException('Communication token has been revoked');
    if (entry.expiresAt && entry.expiresAt < new Date()) throw new UnauthorizedException('Communication token has expired');

    this.tokens.updateOne({ tokenId: entry.tokenId }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

    const organization = await this.organizations.findOrganizationSummary(entry.organizationId);
    return {
      organizationId: entry.organizationId,
      organizationName: organization?.name ?? '',
      tokenId: entry.tokenId,
    };
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
