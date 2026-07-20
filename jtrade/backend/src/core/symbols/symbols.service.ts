import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Symbol, SymbolDocument } from './schemas/symbol.schema';
import { CreateSymbolDto } from './dto/create-symbol.dto';
import { UpdateSymbolDto } from './dto/update-symbol.dto';
import { SymbolMapper } from './mappers/symbol.mapper';
import { BulkCreateSymbolDto } from './dto/bulk-create-symbol.dto';

import {
  CompanyProvider,
  CompanyProviderDocument,
} from '../company-provider/schemas/company-provider.schema';

@Injectable()
export class SymbolsService {
  constructor(
    @InjectModel(Symbol.name)
    private readonly symbolModel: Model<SymbolDocument>,

    @InjectModel(CompanyProvider.name)
    private readonly companyProviderModel: Model<CompanyProviderDocument>,
  ) {}

  private readonly populateCompany = {
    path: 'companyProviderId',
    select: 'companyName status isVerified isActive',
  };

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid id');
    }

    return new Types.ObjectId(id);
  }

  private normalizeSymbol(symbol: string) {
    return symbol.trim().toUpperCase();
  }

  private async assertCompanyProviderExists(companyProviderId: Types.ObjectId) {
    const exists = await this.companyProviderModel
      .exists({
        _id: companyProviderId,
      })
      .exec();

    if (!exists) {
      throw new NotFoundException('Company provider not found');
    }
  }

  async create(dto: CreateSymbolDto) {
    const companyProviderId = this.toObjectId(dto.companyProviderId);
    const normalizedSymbol = this.normalizeSymbol(dto.symbol);

    await this.assertCompanyProviderExists(companyProviderId);

    const exists = await this.symbolModel
      .findOne({
        companyProviderId,
        symbol: normalizedSymbol,
      })
      .lean()
      .exec();

    if (exists) {
      throw new ConflictException(
        'Symbol already exists for this company provider',
      );
    }

    const created = await this.symbolModel.create({
      companyProviderId,
      symbol: normalizedSymbol,
      isActive: dto.isActive ?? true,
    });

    const populated = await this.symbolModel
      .findById(created._id)
      .populate(this.populateCompany)
      .exec();

    return SymbolMapper.toResponse(populated);
  }

  async bulkCreate(dto: BulkCreateSymbolDto) {
    const companyProviderId = this.toObjectId(dto.companyProviderId);

    await this.assertCompanyProviderExists(companyProviderId);

    const normalizedItems = dto.items.map((item) => ({
      companyProviderId,
      symbol: this.normalizeSymbol(item.symbol),
      isActive: item.isActive ?? true,
    }));

    const symbols = normalizedItems.map((item) => item.symbol);

    const duplicatedInRequest = symbols.filter(
      (symbol, index) => symbols.indexOf(symbol) !== index,
    );

    if (duplicatedInRequest.length > 0) {
      throw new ConflictException({
        message: 'Duplicated symbols in request',
        duplicated: [...new Set(duplicatedInRequest)],
      });
    }

    const existingSymbols = await this.symbolModel
      .find({
        companyProviderId,
        symbol: {
          $in: symbols,
        },
      })
      .select('symbol')
      .lean()
      .exec();

    if (existingSymbols.length > 0) {
      throw new ConflictException({
        message: 'Some symbols already exist for this company provider',
        existing: existingSymbols.map((item) => item.symbol),
      });
    }

    const created = await this.symbolModel.insertMany(normalizedItems, {
      ordered: true,
    });

    return {
      message: 'Symbols created successfully',
      total: created.length,
      items: created.map((item) => SymbolMapper.toResponse(item)),
    };
  }

  async findAll(companyProviderId?: string) {
    const filter: any = {};

    if (companyProviderId) {
      filter.companyProviderId = this.toObjectId(companyProviderId);
    }

    const data = await this.symbolModel
      .find(filter)
      .sort({
        symbol: 1,
      })
      .populate(this.populateCompany)
      .exec();

    return SymbolMapper.toResponseList(data);
  }

  async findActive(companyProviderId?: string) {
    const filter: any = {
      isActive: true,
    };

    if (companyProviderId) {
      filter.companyProviderId = this.toObjectId(companyProviderId);
    }

    const data = await this.symbolModel
      .find(filter)
      .sort({
        symbol: 1,
      })
      .populate(this.populateCompany)
      .exec();

    return SymbolMapper.toResponseList(data);
  }

  async findOneBySymbol(companyProviderId: string, symbol: string) {
    const providerId = this.toObjectId(companyProviderId);
    const normalizedSymbol = this.normalizeSymbol(symbol);

    const found = await this.symbolModel
      .findOne({
        companyProviderId: providerId,
        symbol: normalizedSymbol,
      })
      .populate(this.populateCompany)
      .exec();

    if (!found) {
      throw new NotFoundException('Symbol not found');
    }

    return SymbolMapper.toResponse(found);
  }

  async update(id: string, dto: UpdateSymbolDto) {
    const _id = this.toObjectId(id);

    const current = await this.symbolModel.findById(_id).exec();

    if (!current) {
      throw new NotFoundException('Symbol not found');
    }

    const payload: any = {};

    if (dto.companyProviderId) {
      const companyProviderId = this.toObjectId(dto.companyProviderId);
      await this.assertCompanyProviderExists(companyProviderId);
      payload.companyProviderId = companyProviderId;
    }

    if (dto.symbol) {
      payload.symbol = this.normalizeSymbol(dto.symbol);
    }

    if (typeof dto.isActive === 'boolean') {
      payload.isActive = dto.isActive;
    }

    const nextCompanyProviderId =
      payload.companyProviderId ?? current.companyProviderId;

    const nextSymbol = payload.symbol ?? current.symbol;

    const exists = await this.symbolModel
      .findOne({
        _id: {
          $ne: _id,
        },
        companyProviderId: nextCompanyProviderId,
        symbol: nextSymbol,
      })
      .lean()
      .exec();

    if (exists) {
      throw new ConflictException(
        'Symbol already exists for this company provider',
      );
    }

    const updated = await this.symbolModel
      .findByIdAndUpdate(_id, payload, {
        new: true,
      })
      .populate(this.populateCompany)
      .exec();

    return SymbolMapper.toResponse(updated);
  }

  async updateStatus(id: string, isActive: boolean) {
    const _id = this.toObjectId(id);

    const updated = await this.symbolModel
      .findByIdAndUpdate(
        _id,
        {
          isActive,
        },
        {
          new: true,
        },
      )
      .populate(this.populateCompany)
      .exec();

    if (!updated) {
      throw new NotFoundException('Symbol not found');
    }

    return SymbolMapper.toResponse(updated);
  }

  async remove(id: string) {
    const _id = this.toObjectId(id);

    const deleted = await this.symbolModel.findByIdAndDelete(_id).exec();

    if (!deleted) {
      throw new NotFoundException('Symbol not found');
    }

    return {
      message: 'Symbol deleted successfully',
      id: String(deleted._id),
      companyProviderId: String(deleted.companyProviderId),
      symbol: deleted.symbol,
    };
  }
}
