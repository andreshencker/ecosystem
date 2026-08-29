import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TypeProduct, TypeProductDocument } from '../type-products/schemas/type-product.schema';
import type { AuthContext } from '../auth/types/auth-context';
import { PlatformsService } from '../platforms/platforms.service';
import { CreateProductDto, CreateProductVersionDto, UpdateProductDto } from './dto/product.dto';
import { Product, ProductDocument } from './schemas/product.schema';
import { ProductVersion, ProductVersionDocument } from './schemas/product-version.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(ProductVersion.name) private readonly versions: Model<ProductVersionDocument>,
    @InjectModel(TypeProduct.name) private readonly types: Model<TypeProductDocument>,
    private readonly platforms: PlatformsService,
  ) {}

  async create(context: AuthContext, dto: CreateProductDto) {
    await this.validateCatalogues(dto.typeProductId, dto.platforms?.map((item) => item.platformId) ?? []);
    const key = this.normalizeKey(dto.key);
    try {
      return await this.products.create({
        providerOrganizationId: context.organizationId,
        createdByGrapiflyUserId: context.grapiflyUserId,
        updatedByGrapiflyUserId: context.grapiflyUserId,
        typeProductId: new Types.ObjectId(dto.typeProductId), key, name: dto.name.trim(),
        description: dto.description?.trim() ?? '', platforms: this.mapPlatforms(dto.platforms ?? []), status: 'draft',
      });
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('Product key already exists in this provider organization');
      throw error;
    }
  }

  listMine(context: AuthContext) {
    return this.products.find({ providerOrganizationId: context.organizationId }).populate('typeProductId').populate('platforms.platformId').sort({ updatedAt: -1 }).lean();
  }

  listPublished() {
    return this.products.find({ status: 'published' }).populate('typeProductId').populate('platforms.platformId').sort({ updatedAt: -1 }).lean();
  }

  listAllForInternal() {
    return this.products.find().populate('typeProductId').populate('platforms.platformId').sort({ updatedAt: -1 }).lean();
  }

  async findMine(context: AuthContext, id: string) {
    const product = await this.products.findOne({ _id: this.objectId(id), providerOrganizationId: context.organizationId }).populate('typeProductId').populate('platforms.platformId').lean();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(context: AuthContext, id: string, dto: UpdateProductDto) {
    if (dto.status && !['draft', 'pending_review', 'archived'].includes(dto.status)) {
      throw new BadRequestException('Providers may only use draft, pending_review or archived status');
    }
    if (dto.typeProductId || dto.platforms) {
      const current = await this.findMine(context, id);
      await this.validateCatalogues(dto.typeProductId ?? String((current as any).typeProductId?._id ?? (current as any).typeProductId), dto.platforms?.map((item) => item.platformId) ?? []);
    }
    const patch: Record<string, unknown> = { updatedByGrapiflyUserId: context.grapiflyUserId };
    if (dto.typeProductId) patch.typeProductId = new Types.ObjectId(dto.typeProductId);
    if (dto.key) patch.key = this.normalizeKey(dto.key);
    if (dto.name) patch.name = dto.name.trim();
    if (dto.description !== undefined) patch.description = dto.description.trim();
    if (dto.platforms) patch.platforms = this.mapPlatforms(dto.platforms);
    if (dto.status) patch.status = dto.status;
    const updated = await this.products.findOneAndUpdate(
      { _id: this.objectId(id), providerOrganizationId: context.organizationId }, { $set: patch }, { new: true, runValidators: true },
    ).lean();
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  async reviewStatus(id: string, status: 'published' | 'suspended' | 'draft', reviewerId: string) {
    const updated = await this.products.findByIdAndUpdate(this.objectId(id), { $set: { status, updatedByGrapiflyUserId: reviewerId } }, { new: true }).lean();
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  async createVersion(context: AuthContext, dto: CreateProductVersionDto) {
    const product = await this.products.findOne({ _id: this.objectId(dto.productId), providerOrganizationId: context.organizationId }).lean();
    if (!product) throw new NotFoundException('Product not found');
    const platformId = this.objectId(dto.platformId);
    if (!product.platforms.some((entry) => String(entry.platformId) === String(platformId))) {
      throw new BadRequestException('Platform is not configured for this product');
    }
    try {
      return await this.versions.create({
        providerOrganizationId: context.organizationId, productId: product._id, platformId,
        version: dto.version.trim(), fileName: dto.fileName.trim(), originalFileName: dto.originalFileName?.trim() ?? '',
        extension: dto.extension.trim().toLowerCase(), fileKey: dto.fileKey.trim(), size: dto.size ?? 0,
        contentType: dto.contentType?.trim() ?? 'application/octet-stream', releaseNotes: dto.releaseNotes?.trim() ?? '',
        status: 'draft', createdByGrapiflyUserId: context.grapiflyUserId,
      });
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('This product version already exists for the platform');
      throw error;
    }
  }

  listVersions(context: AuthContext, productId: string) {
    return this.versions.find({ providerOrganizationId: context.organizationId, productId: this.objectId(productId) }).sort({ createdAt: -1 }).lean();
  }

  private async validateCatalogues(typeProductId: string, platformIds: string[]) {
    const uniquePlatformIds = [...new Set(platformIds)];
    if (uniquePlatformIds.length !== platformIds.length) throw new BadRequestException('A platform cannot be repeated in a product');
    const [typeExists, activePlatforms] = await Promise.all([
      this.types.exists({ _id: this.objectId(typeProductId), isActive: true }),
      uniquePlatformIds.length ? this.platforms.findAll({ active: true }) : Promise.resolve([]),
    ]);
    if (!typeExists) throw new BadRequestException('Invalid or inactive product type');
    const activeIds = new Set(activePlatforms.map((p) => p.id));
    const allValid = uniquePlatformIds.every((id) => activeIds.has(id));
    if (!allValid) throw new BadRequestException('One or more platforms are invalid or inactive');
  }

  private mapPlatforms(entries: CreateProductDto['platforms'] | UpdateProductDto['platforms']) {
    return (entries ?? []).map((entry) => ({
      platformId: this.objectId(entry.platformId), deliveryMode: entry.deliveryMode ?? 'download',
      runtimeMode: entry.runtimeMode ?? 'none', status: entry.status ?? 'draft', notes: entry.notes?.trim() ?? '',
      currentVersionId: null, currentVersion: null,
    }));
  }

  private normalizeKey(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  private objectId(value: string) {
    if (!Types.ObjectId.isValid(value)) throw new BadRequestException('Invalid id');
    return new Types.ObjectId(value);
  }
}
