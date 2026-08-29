import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TypeProduct, TypeProductDocument } from '../type-products/schemas/type-product.schema';
import type { AuthContext } from '../auth/types/auth-context';
import { PlatformsService } from '../platforms/platforms.service';
import { RelayStorageService } from '../../integrations/relay/relay-storage.service';
import { CreateProductDto, CreateProductVersionDto, ReplaceProductVersionFileDto, UpdateProductDto } from './dto/product.dto';
import { Product, ProductDocument } from './schemas/product.schema';
import { ProductVersion, ProductVersionDocument } from './schemas/product-version.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(ProductVersion.name) private readonly versions: Model<ProductVersionDocument>,
    @InjectModel(TypeProduct.name) private readonly types: Model<TypeProductDocument>,
    private readonly platforms: PlatformsService,
    private readonly relayStorage: RelayStorageService,
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

  async createVersion(context: AuthContext, productId: string, file: Express.Multer.File | undefined, dto: CreateProductVersionDto) {
    if (!file) throw new BadRequestException('file is required');
    const product = await this.findMineForPlatform(context, productId, dto.platformId);
    const platformId = this.objectId(dto.platformId);
    const version = dto.version.trim();
    const extension = this.extensionFromOriginalName(file.originalname);
    const fileName = `${version}.${extension}`;

    const uploaded = await this.relayStorage.uploadProductVersionFile(file, context.organizationId, dto.platformId, fileName);

    try {
      const created = await this.versions.create({
        providerOrganizationId: context.organizationId, productId: product._id, platformId,
        version, fileName: uploaded.fileName, originalFileName: file.originalname,
        extension, fileKey: uploaded.key, size: uploaded.size, contentType: uploaded.contentType,
        releaseNotes: dto.releaseNotes?.trim() ?? '', status: 'draft', isCurrentVersion: false,
        createdByGrapiflyUserId: context.grapiflyUserId,
      });
      if (!dto.isCurrentVersion) return created;
      await this.promoteCurrentVersion(product._id, platformId, created._id, version);
      return this.versions.findById(created._id).lean();
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('This product version already exists for the platform');
      throw error;
    }
  }

  async replaceVersionFile(context: AuthContext, versionId: string, file: Express.Multer.File | undefined, dto: ReplaceProductVersionFileDto) {
    if (!file) throw new BadRequestException('file is required');
    const existing = await this.findVersionMine(context, versionId);
    const version = dto.version?.trim() || existing.version;
    const extension = this.extensionFromOriginalName(file.originalname);
    const fileName = `${version}.${extension}`;

    const uploaded = await this.relayStorage.replaceProductVersionFile(
      file, existing.fileKey, context.organizationId, String(existing.platformId), fileName,
    );

    const updated = await this.versions.findByIdAndUpdate(existing._id, {
      $set: {
        version, fileName: uploaded.fileName, originalFileName: file.originalname, extension,
        fileKey: uploaded.key, size: uploaded.size, contentType: uploaded.contentType,
        ...(dto.releaseNotes !== undefined ? { releaseNotes: dto.releaseNotes.trim() } : {}),
      },
    }, { new: true, runValidators: true }).lean();
    if (!updated) throw new NotFoundException('Product version not found');
    if (!dto.isCurrentVersion) return updated;

    await this.promoteCurrentVersion(existing.productId, existing.platformId, existing._id, version);
    return this.versions.findById(existing._id).lean();
  }

  async markCurrentVersion(context: AuthContext, versionId: string) {
    const existing = await this.findVersionMine(context, versionId);
    await this.promoteCurrentVersion(existing.productId, existing.platformId, existing._id, existing.version);
    return this.versions.findById(existing._id).lean();
  }

  async downloadVersion(context: AuthContext, versionId: string, expiresInSeconds?: number) {
    const existing = await this.findVersionMine(context, versionId);
    return this.relayStorage.getProductVersionDownloadUrl(existing.fileKey, expiresInSeconds, existing.fileName);
  }

  listVersions(context: AuthContext, productId: string) {
    return this.versions.find({ providerOrganizationId: context.organizationId, productId: this.objectId(productId) }).sort({ createdAt: -1 }).lean();
  }

  private async findMineForPlatform(context: AuthContext, productId: string, platformId: string) {
    const product = await this.products.findOne({ _id: this.objectId(productId), providerOrganizationId: context.organizationId }).lean();
    if (!product) throw new NotFoundException('Product not found');
    if (!product.platforms.some((entry) => String(entry.platformId) === platformId)) {
      throw new BadRequestException('Platform is not configured for this product');
    }
    return product;
  }

  private async findVersionMine(context: AuthContext, versionId: string) {
    const version = await this.versions.findOne({ _id: this.objectId(versionId), providerOrganizationId: context.organizationId }).lean();
    if (!version) throw new NotFoundException('Product version not found');
    return version;
  }

  private async promoteCurrentVersion(productId: Types.ObjectId, platformId: Types.ObjectId, versionId: Types.ObjectId, version: string) {
    await this.versions.updateMany(
      { productId, platformId, isCurrentVersion: true, _id: { $ne: versionId } },
      { $set: { isCurrentVersion: false } },
    );
    await this.versions.findByIdAndUpdate(versionId, { $set: { isCurrentVersion: true } });
    await this.products.updateOne(
      { _id: productId, 'platforms.platformId': platformId },
      { $set: { 'platforms.$.currentVersionId': versionId, 'platforms.$.currentVersion': version } },
    );
  }

  private extensionFromOriginalName(originalname: string): string {
    const match = /\.([a-zA-Z0-9]+)$/.exec(originalname ?? '');
    return (match?.[1] ?? 'bin').toLowerCase();
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
