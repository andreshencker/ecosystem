// src/communication/channels/oauth-applications/oauth-applications.service.ts

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  OAuthApplication,
  OAuthApplicationDocument,
} from './schemas/oauth-application.schema';
import { CreateOAuthApplicationDto } from './dto/create-oauth-application.dto';
import { OAuthApplicationResponseDto } from './dto/oauth-application-response.dto';
import { CryptoService } from '../../common/security/crypto.service';
import {
  Company,
  CompanyDocument,
} from '../../company/company-info/schemas/company.schema';

@Injectable()
export class OAuthApplicationsService {
  constructor(
    @InjectModel(OAuthApplication.name)
    private readonly model: Model<OAuthApplicationDocument>,
    @InjectModel(Company.name)
    private readonly companyModel: Model<CompanyDocument>,
    private readonly crypto: CryptoService,
  ) {}

  /** The platform company's apps are visible to every company ("ecosystem" mode). */
  private async getPlatformCompanyId(): Promise<Types.ObjectId | null> {
    const platform = await this.companyModel
      .findOne({ isPlatformCompany: true })
      .select('_id')
      .lean();
    return platform ? new Types.ObjectId((platform as any)._id) : null;
  }

  private toObjectIdOrThrow(id: string, label: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new HttpException(`Invalid ${label}`, HttpStatus.BAD_REQUEST);
    }
    return new Types.ObjectId(id);
  }

  /** Truncates a clientId for safe display — never shows the full value in bulk listings unnecessarily long. */
  private maskClientId(clientId: string): string {
    if (clientId.length <= 24) return clientId;
    return `${clientId.slice(0, 16)}...${clientId.slice(-12)}`;
  }

  private toResponse(doc: any, isEcosystem: boolean): OAuthApplicationResponseDto {
    return {
      id: String(doc._id),
      providerFamily: String(doc.providerFamily),
      displayName: String(doc.displayName),
      clientId: this.maskClientId(String(doc.clientId)),
      isActive: doc.isActive !== false,
      isEcosystem,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
    };
  }

  async create(
    companyId: string,
    dto: CreateOAuthApplicationDto,
  ): Promise<OAuthApplicationResponseDto> {
    const companyObjId = this.toObjectIdOrThrow(companyId, 'companyId');

    const providerFamily = dto.providerFamily.toLowerCase().trim();
    const displayName = dto.displayName.trim();
    const clientId = dto.clientId.trim();

    if (!providerFamily || !displayName || !clientId || !dto.clientSecret) {
      throw new HttpException(
        'providerFamily, displayName, clientId and clientSecret are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const encryptedSecret = this.crypto.encryptJson({
      clientSecret: dto.clientSecret,
    });

    const created = await this.model.create({
      companyId: companyObjId,
      providerFamily,
      displayName,
      clientId,
      encryptedSecret,
      isActive: true,
    });

    const platformCompanyId = await this.getPlatformCompanyId();
    const isEcosystem = Boolean(
      platformCompanyId && platformCompanyId.equals(companyObjId),
    );

    return this.toResponse(created.toObject(), isEcosystem);
  }

  /**
   * Lists OAuth applications visible to this company for a provider family:
   * its own registrations, plus the platform company's ("ecosystem") ones —
   * so any company can use Relay's own Google app without registering one.
   */
  async findAllForCompany(params: {
    companyId: string;
    providerFamily?: string;
  }): Promise<OAuthApplicationResponseDto[]> {
    const companyObjId = this.toObjectIdOrThrow(
      params.companyId,
      'companyId',
    );
    const platformCompanyId = await this.getPlatformCompanyId();

    const visibleCompanyIds = platformCompanyId
      ? [companyObjId, platformCompanyId]
      : [companyObjId];

    const filter: any = {
      companyId: { $in: visibleCompanyIds },
      isActive: true,
    };
    if (params.providerFamily) {
      filter.providerFamily = params.providerFamily.toLowerCase().trim();
    }

    const list = await this.model.find(filter).sort({ createdAt: -1 }).lean();
    return list.map((doc) =>
      this.toResponse(
        doc,
        Boolean(
          platformCompanyId &&
            platformCompanyId.equals((doc as any).companyId),
        ),
      ),
    );
  }

  /**
   * Reads and decrypts the clientId/clientSecret for internal use by an
   * OAuth flow (e.g. GmailOAuthService, GoogleIdentityOAuthService).
   * Validates company ownership. Throws if not found or company mismatch.
   */
  async readDecryptedForCompany(params: {
    oauthApplicationId: string;
    companyId: string;
  }): Promise<{ clientId: string; clientSecret: string }> {
    const _id = this.toObjectIdOrThrow(
      params.oauthApplicationId,
      'oauthApplicationId',
    );
    const companyObjId = this.toObjectIdOrThrow(
      params.companyId,
      'companyId',
    );
    const platformCompanyId = await this.getPlatformCompanyId();

    const visibleCompanyIds = platformCompanyId
      ? [companyObjId, platformCompanyId]
      : [companyObjId];

    const doc = await this.model
      .findOne({ _id, companyId: { $in: visibleCompanyIds }, isActive: true })
      .lean();

    if (!doc) {
      throw new HttpException(
        'OAuth application not found or is not visible to this company',
        HttpStatus.NOT_FOUND,
      );
    }

    const decrypted = this.crypto.decryptJson((doc as any).encryptedSecret) as {
      clientSecret: string;
    };

    return {
      clientId: (doc as any).clientId,
      clientSecret: decrypted.clientSecret,
    };
  }

  /**
   * Reads and decrypts the *platform* company's OAuth app for a provider
   * family (e.g. Grapifly asking Relay for the shared Google login
   * credentials so they don't have to be duplicated into Grapifly's env).
   * Returns null when the platform company has no such app registered.
   */
  async readPlatformDecrypted(
    providerFamily: string,
  ): Promise<{ clientId: string; clientSecret: string } | null> {
    const platformCompanyId = await this.getPlatformCompanyId();
    if (!platformCompanyId) return null;

    const doc = await this.model
      .findOne({
        companyId: platformCompanyId,
        providerFamily: providerFamily.toLowerCase().trim(),
        isActive: true,
      })
      .sort({ createdAt: -1 })
      .lean();
    if (!doc) return null;

    const decrypted = this.crypto.decryptJson((doc as any).encryptedSecret) as {
      clientSecret: string;
    };
    return {
      clientId: (doc as any).clientId,
      clientSecret: decrypted.clientSecret,
    };
  }
}
