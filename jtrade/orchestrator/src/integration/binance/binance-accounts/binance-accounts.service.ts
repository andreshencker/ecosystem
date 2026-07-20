// src/integrations/binance/binance-accounts/binance-accounts.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BinanceAccount,
  BinanceAccountDocument,
} from './schemas/binance-account.schema';
import { CreateBinanceAccountDto } from './dto/create-binance-account.dto';
import { UpdateBinanceAccountDto } from './dto/update-binance-account.dto';
import { EncryptionService } from '../../../common/security/encryption.service';
import {
  BinanceAccountMapper,
  BinanceAccountView,
} from './mappers/binance-account.mapper';

@Injectable()
export class BinanceAccountsService {
  private readonly log = new Logger(BinanceAccountsService.name);

  constructor(
    @InjectModel(BinanceAccount.name)
    private readonly accountModel: Model<BinanceAccountDocument>,
    private readonly enc: EncryptionService,
  ) {}

  async getOrThrow(accountId: string): Promise<BinanceAccountDocument> {
    const id = (accountId ?? '').trim();
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new HttpException('Invalid accountId', HttpStatus.BAD_REQUEST);
    }
    const doc = await this.accountModel.findById(new Types.ObjectId(id)).lean();
    if (!doc) {
      throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
    }
    // @ts-ignore
    return doc as BinanceAccountDocument;
  }

  // usado por BinanceClientFactory
  async getDecryptedCredsOrThrow(
    id: string,
  ): Promise<{ apiKey: string; apiSecret: string }> {
    const doc = await this.getOrThrow(id);
    if (!doc.apiKey || !doc.apiSecret) {
      throw new HttpException(
        'Missing API credentials in account',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      return {
        apiKey: doc.apiKey,
        apiSecret: this.enc.decode(doc.apiSecret),
      };
    } catch (e: any) {
      this.log.error(`Decrypt failed for account ${id}: ${e?.message ?? e}`);
      throw new HttpException(
        'Could not decrypt API secret',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** Listar cuentas (opcionalmente filtradas por plataforma) */
  async listAll(platformId?: string): Promise<BinanceAccountView[]> {
    try {
      const q: any = {};
      if (platformId) {
        q.userPlatformId = platformId.trim();
      }

      const rows = await this.accountModel
        .find(q)
        .sort({ isDefault: -1, createdAt: -1 })
        .lean()
        .exec();

      return BinanceAccountMapper.toViewList(rows);
    } catch (e) {
      this.log.error(
        'listAll failed',
        e instanceof Error ? e.stack : String(e),
      );
      throw this.asHttpError(e);
    }
  }

  /** Crear una nueva cuenta */
  async create(dto: CreateBinanceAccountDto): Promise<BinanceAccountView> {
    try {
      if (!dto.userPlatformId?.trim()) {
        throw new HttpException(
          'userPlatformId is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const platformId = dto.userPlatformId.trim();

      // validar que al menos parezca ObjectId
      if (!Types.ObjectId.isValid(platformId)) {
        this.log.warn(
          `Received non-ObjectId userPlatformId="${dto.userPlatformId}"`,
        );
        throw new HttpException(
          'Invalid userPlatformId',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!dto.apiKey?.trim() || !dto.apiSecret?.trim()) {
        throw new HttpException(
          'Missing API credentials',
          HttpStatus.BAD_REQUEST,
        );
      }

      // comprobar si es la primera cuenta de esta plataforma
      const existingCount = await this.accountModel.countDocuments({
        userPlatformId: platformId,
      });

      // si es la primera → siempre default
      let isDefault = !!dto.isDefault;
      if (existingCount === 0) {
        isDefault = true;
      }

      const doc = new this.accountModel({
        userPlatformId: platformId,
        description: dto.description?.trim() ?? '',
        apiKey: dto.apiKey.trim(),
        apiSecret: this.enc.encode(dto.apiSecret.trim()),
        isActive: dto.isActive ?? true,
        isDefault,
      });

      const created = await doc.save();

      // si quedó como default → desmarcar las demás de esa plataforma
      if (created.isDefault) {
        await this.accountModel.updateMany(
          {
            userPlatformId: created.userPlatformId,
            _id: { $ne: created._id },
          },
          { $set: { isDefault: false } },
        );
      }

      return BinanceAccountMapper.toView(created);
    } catch (e: any) {
      if (e?.code === 11000) {
        const msg = e?.keyPattern?.apiKey
          ? 'There is already a Binance account with this apiKey for this platform'
          : 'Duplicated description for this platform';
        throw new HttpException(msg, HttpStatus.BAD_REQUEST);
      }
      this.log.error('create failed', e instanceof Error ? e.stack : String(e));
      throw this.asHttpError(e);
    }
  }

  async getById(id: string): Promise<BinanceAccountView> {
    const doc = await this.getOrThrow(id);
    return BinanceAccountMapper.toView(doc);
  }

  async update(
    id: string,
    dto: UpdateBinanceAccountDto,
  ): Promise<BinanceAccountView> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException('Invalid id', HttpStatus.BAD_REQUEST);
      }

      const doc = await this.accountModel.findById(new Types.ObjectId(id));
      if (!doc) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }

      const wasDefault = doc.isDefault;

      if (dto.apiKey !== undefined) {
        if (!dto.apiKey.trim()) {
          throw new HttpException(
            'apiKey cannot be empty',
            HttpStatus.BAD_REQUEST,
          );
        }
        doc.apiKey = dto.apiKey.trim();
      }

      if (dto.apiSecret !== undefined) {
        if (!dto.apiSecret.trim()) {
          throw new HttpException(
            'apiSecret cannot be empty',
            HttpStatus.BAD_REQUEST,
          );
        }
        doc.apiSecret = this.enc.encode(dto.apiSecret.trim());
      }

      if (dto.description !== undefined) {
        doc.description = dto.description.trim();
      }
      if (dto.isActive !== undefined) {
        doc.isActive = dto.isActive;
      }
      if (dto.isDefault !== undefined) {
        doc.isDefault = dto.isDefault;
      }

      const saved = await doc.save();

      // caso 1: esta cuenta queda como default → el resto deja de serlo
      if (saved.isDefault) {
        await this.accountModel.updateMany(
          {
            userPlatformId: saved.userPlatformId,
            _id: { $ne: saved._id },
          },
          { $set: { isDefault: false } },
        );
      }
      // caso 2: era default y la hemos desmarcado → elegir otra default (si hay)
      else if (wasDefault && dto.isDefault === false) {
        const replacement = await this.accountModel
          .findOne({
            userPlatformId: saved.userPlatformId,
            _id: { $ne: saved._id },
          })
          .sort({ isActive: -1, createdAt: -1 })
          .exec();

        if (replacement) {
          replacement.isDefault = true;
          const newDefault = await replacement.save();

          await this.accountModel.updateMany(
            {
              userPlatformId: newDefault.userPlatformId,
              _id: { $ne: newDefault._id },
            },
            { $set: { isDefault: false } },
          );
        }
      }

      return BinanceAccountMapper.toView(saved);
    } catch (e: any) {
      if (e?.code === 11000) {
        const msg = e?.keyPattern?.apiKey
          ? 'There is already a Binance account with this apiKey for this platform'
          : 'Duplicated description for this platform';
        throw new HttpException(msg, HttpStatus.BAD_REQUEST);
      }
      this.log.error('update failed', e instanceof Error ? e.stack : String(e));
      throw this.asHttpError(e);
    }
  }

  // Método específico para /:id/default
  async setDefault(id: string): Promise<BinanceAccountView> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException('Invalid id', HttpStatus.BAD_REQUEST);
      }

      const doc = await this.accountModel.findById(new Types.ObjectId(id));
      if (!doc) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }

      if (!doc.isDefault) {
        doc.isDefault = true;
        const saved = await doc.save();

        await this.accountModel.updateMany(
          {
            userPlatformId: saved.userPlatformId,
            _id: { $ne: saved._id },
          },
          { $set: { isDefault: false } },
        );

        return BinanceAccountMapper.toView(saved);
      }

      // si ya era default, simplemente devolvemos la vista
      return BinanceAccountMapper.toView(doc);
    } catch (e) {
      this.log.error(
        'setDefault failed',
        e instanceof Error ? e.stack : String(e),
      );
      throw this.asHttpError(e);
    }
  }

  async remove(id: string) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new HttpException('Invalid id', HttpStatus.BAD_REQUEST);
      }

      const objectId = new Types.ObjectId(id);

      // necesitamos saber si era default y su plataforma
      const doc = await this.accountModel.findById(objectId);
      if (!doc) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }

      const wasDefault = doc.isDefault;
      const platformId = doc.userPlatformId;

      const res = await this.accountModel.deleteOne({ _id: objectId });

      if (res.deletedCount === 0) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }

      // si borramos la default → elegir nueva default (si existe otra)
      if (wasDefault) {
        const replacement = await this.accountModel
          .findOne({ userPlatformId: platformId })
          .sort({ isActive: -1, createdAt: -1 })
          .exec();

        if (replacement) {
          replacement.isDefault = true;
          const newDefault = await replacement.save();

          await this.accountModel.updateMany(
            {
              userPlatformId: newDefault.userPlatformId,
              _id: { $ne: newDefault._id },
            },
            { $set: { isDefault: false } },
          );
        }
      }

      return { ok: true };
    } catch (e) {
      this.log.error('remove failed', e instanceof Error ? e.stack : String(e));
      throw this.asHttpError(e);
    }
  }

  private asHttpError(
    e: any,
    fallback: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    if (e instanceof HttpException) return e;
    const msg = e?.message || 'Unexpected error';
    return new HttpException(msg, fallback);
  }
}
