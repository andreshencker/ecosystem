import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TypeProduct, TypeProductDocument } from '../type-products/schemas/type-product.schema';
import type { AuthContext } from '../auth/types/auth-context';
import { PlatformsService } from '../platforms/platforms.service';
import { RelayStorageService } from '../../integrations/relay/relay-storage.service';
import { Indicator, IndicatorDocument } from '../indicators/schemas/indicator.schema';
import { CreateProductDto, CreateProductVersionDto, ProductParamDto, ProductPresentationDto, ReplaceProductVersionFileDto, UpdateProductDto } from './dto/product.dto';
import { Product, ProductDocument } from './schemas/product.schema';
import { ProductVersion, ProductVersionDocument } from './schemas/product-version.schema';
import { ProductPricing, ProductPricingDocument } from '../product-pricing/schemas/product-pricing.schema';
import { SIGNALS_TYPE_KEY } from './product-type-keys';

/** Param keys jtrade owns — the provider cannot use these. */
const RESERVED_PARAM_KEYS = new Set([
  'productId', 'codeVersion', 'account', 'commRoute', 'subscriptionActive',
]);

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(ProductVersion.name) private readonly versions: Model<ProductVersionDocument>,
    @InjectModel(ProductPricing.name) private readonly pricing: Model<ProductPricingDocument>,
    @InjectModel(TypeProduct.name) private readonly types: Model<TypeProductDocument>,
    @InjectModel(Indicator.name) private readonly indicators: Model<IndicatorDocument>,
    private readonly platforms: PlatformsService,
    private readonly relayStorage: RelayStorageService,
  ) {}

  private readonly populate = ['typeProductId', 'platformId', 'platformIds', 'indicatorIds'];

  async create(context: AuthContext, dto: CreateProductDto) {
    // The product KIND is required and chosen BEFORE onboarding; it must be an
    // active type. Platform stays optional (deferred to ProductVersion).
    const type = await this.assertActiveType(dto.typeProductId);
    if (dto.platformId) await this.assertPlatform(dto.platformId);
    const platformIds = await this.assertPlatforms(dto.platformIds);
    const indicatorIds = await this.resolveIndicatorIds(context, type.key, dto.indicatorIds);
    const key = this.normalizeKey(dto.key);
    try {
      const created = await this.products.create({
        providerOrganizationId: context.organizationId,
        createdByGrapiflyUserId: context.grapiflyUserId,
        updatedByGrapiflyUserId: context.grapiflyUserId,
        typeProductId: new Types.ObjectId(dto.typeProductId),
        platformId: dto.platformId ? new Types.ObjectId(dto.platformId) : null,
        platformIds,
        key, name: dto.name.trim(), description: dto.description?.trim() ?? '',
        tagline: dto.tagline?.trim() ?? '',
        shortDescription: dto.shortDescription?.trim() ?? '',
        logoUrl: dto.logoUrl?.trim() ?? '',
        coverImageUrl: dto.coverImageUrl?.trim() ?? '',
        status: 'draft',
        indicatorIds,
      });
      return this.products.findById(created._id).populate(this.populate).lean();
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('Product key already exists in this provider organization');
      throw error;
    }
  }

  listMine(context: AuthContext) {
    return this.products.find({ providerOrganizationId: context.organizationId }).populate(this.populate).sort({ updatedAt: -1 }).lean();
  }

  listPublished() {
    return this.products.find({ status: 'published' }).populate(this.populate).sort({ updatedAt: -1 }).lean();
  }

  listAllForInternal() {
    return this.products.find().populate(this.populate).sort({ updatedAt: -1 }).lean();
  }

  async findMine(context: AuthContext, id: string) {
    const product = await this.products.findOne({ _id: this.objectId(id), providerOrganizationId: context.organizationId }).populate(this.populate).lean();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(context: AuthContext, id: string, dto: UpdateProductDto) {
    if (dto.status && !['draft', 'pending_review', 'archived'].includes(dto.status)) {
      throw new BadRequestException('Providers may only use draft, pending_review or archived status');
    }
    const current = await this.products.findOne({ _id: this.objectId(id), providerOrganizationId: context.organizationId }).populate('typeProductId').lean();
    if (!current) throw new NotFoundException('Product not found');

    const patch: Record<string, unknown> = { updatedByGrapiflyUserId: context.grapiflyUserId };
    if (dto.key) patch.key = this.normalizeKey(dto.key);
    if (dto.name) patch.name = dto.name.trim();
    if (dto.description !== undefined) patch.description = dto.description.trim();
    if (dto.status) patch.status = dto.status;

    // ── Identity (commercial) ──
    if (dto.tagline !== undefined) patch.tagline = dto.tagline.trim();
    if (dto.shortDescription !== undefined) patch.shortDescription = dto.shortDescription.trim();
    if (dto.logoUrl !== undefined) patch.logoUrl = dto.logoUrl.trim();
    if (dto.coverImageUrl !== undefined) patch.coverImageUrl = dto.coverImageUrl.trim();

    // ── Presentation (commercial) — merge onto whatever is stored ──
    if (dto.presentation !== undefined) {
      patch.presentation = { ...(current.presentation ?? {}), ...this.normalizePresentation(dto.presentation) };
    }

    // ── Classification (commercial discovery — the product KIND is immutable
    //    and set before onboarding, so it is never touched here) ──
    if (dto.category !== undefined) patch.category = dto.category.trim().toLowerCase();
    if (dto.tags !== undefined) {
      patch.tags = [...new Set(dto.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    }

    // ── Platforms (commercial — which platforms the product operates on) ──
    if (dto.platformIds !== undefined) {
      patch.platformIds = await this.assertPlatforms(dto.platformIds);
    }

    if (dto.indicatorIds !== undefined) {
      const typeKey = (current.typeProductId as any)?.key ?? '';
      patch.indicatorIds = await this.resolveIndicatorIds(context, typeKey, dto.indicatorIds);
    }
    if (dto.params !== undefined) patch.params = this.normalizeParams(dto.params);

    const updated = await this.products.findOneAndUpdate(
      { _id: this.objectId(id), providerOrganizationId: context.organizationId }, { $set: patch }, { new: true, runValidators: true },
    ).populate(this.populate).lean();
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  /**
   * Deletes a product the provider owns. Allowed only while it is NOT published
   * (a published product is live in the marketplace — it must be archived or
   * suspended, never deleted). Cascades its versions + pricing options; a
   * non-published product cannot have orders or signalbots.
   */
  async remove(context: AuthContext, id: string) {
    const _id = this.objectId(id);
    const product = await this.products
      .findOne({ _id, providerOrganizationId: context.organizationId })
      .select('_id status')
      .lean();
    if (!product) throw new NotFoundException('Product not found');
    if (product.status === 'published') {
      throw new ConflictException('A published product cannot be deleted. Archive or suspend it instead.');
    }

    await Promise.all([
      this.versions.deleteMany({ productId: _id }),
      this.pricing.deleteMany({ productId: _id }),
    ]);
    await this.products.deleteOne({ _id });
    return { deleted: true };
  }

  /** Uploads a commercial image (logo | cover) via Relay storage and stores its URL. */
  async setImage(context: AuthContext, id: string, kind: 'logo' | 'cover', file: Express.Multer.File | undefined) {
    if (!file) throw new BadRequestException('file is required');
    const product = await this.products
      .findOne({ _id: this.objectId(id), providerOrganizationId: context.organizationId })
      .lean();
    if (!product) throw new NotFoundException('Product not found');

    const url = await this.relayStorage.uploadProductImage(file, context.organizationId);
    const field = kind === 'cover' ? 'coverImageUrl' : 'logoUrl';
    const updated = await this.products
      .findByIdAndUpdate(
        product._id,
        { $set: { [field]: url, updatedByGrapiflyUserId: context.grapiflyUserId } },
        { new: true },
      )
      .populate(this.populate)
      .lean();
    return updated;
  }

  async reviewStatus(id: string, status: 'published' | 'suspended' | 'draft', reviewerId: string) {
    const updated = await this.products.findByIdAndUpdate(this.objectId(id), { $set: { status, updatedByGrapiflyUserId: reviewerId } }, { new: true }).populate(this.populate).lean();
    if (!updated) throw new NotFoundException('Product not found');
    return updated;
  }

  async createVersion(context: AuthContext, productId: string, file: Express.Multer.File | undefined, dto: CreateProductVersionDto) {
    if (!file) throw new BadRequestException('file is required');
    const product = await this.products.findOne({ _id: this.objectId(productId), providerOrganizationId: context.organizationId }).lean();
    if (!product) throw new NotFoundException('Product not found');
    const platformFolder = String(product.platformId);
    const version = dto.version.trim();
    const extension = this.extensionFromOriginalName(file.originalname);
    const fileName = `${version}.${extension}`;

    const uploaded = await this.relayStorage.uploadProductVersionFile(file, context.organizationId, platformFolder, fileName);

    try {
      const created = await this.versions.create({
        providerOrganizationId: context.organizationId, productId: product._id,
        version, fileName: uploaded.fileName, originalFileName: file.originalname,
        extension, fileKey: uploaded.key, size: uploaded.size, contentType: uploaded.contentType,
        releaseNotes: dto.releaseNotes?.trim() ?? '', status: 'draft', isCurrentVersion: false,
        createdByGrapiflyUserId: context.grapiflyUserId,
      });
      if (!dto.isCurrentVersion) return created;
      await this.promoteCurrentVersion(product._id, created._id);
      return this.versions.findById(created._id).lean();
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('This product version already exists');
      throw error;
    }
  }

  async replaceVersionFile(context: AuthContext, versionId: string, file: Express.Multer.File | undefined, dto: ReplaceProductVersionFileDto) {
    if (!file) throw new BadRequestException('file is required');
    const existing = await this.findVersionMine(context, versionId);
    const product = await this.products.findById(existing.productId).lean();
    const platformFolder = String(product?.platformId ?? '');
    const version = dto.version?.trim() || existing.version;
    const extension = this.extensionFromOriginalName(file.originalname);
    const fileName = `${version}.${extension}`;

    const uploaded = await this.relayStorage.replaceProductVersionFile(
      file, existing.fileKey, context.organizationId, platformFolder, fileName,
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

    await this.promoteCurrentVersion(existing.productId, existing._id);
    return this.versions.findById(existing._id).lean();
  }

  async markCurrentVersion(context: AuthContext, versionId: string) {
    const existing = await this.findVersionMine(context, versionId);
    await this.promoteCurrentVersion(existing.productId, existing._id);
    return this.versions.findById(existing._id).lean();
  }

  async downloadVersion(context: AuthContext, versionId: string, expiresInSeconds?: number) {
    const existing = await this.findVersionMine(context, versionId);
    return this.relayStorage.getProductVersionDownloadUrl(existing.fileKey, expiresInSeconds, existing.fileName);
  }

  listVersions(context: AuthContext, productId: string) {
    return this.versions.find({ providerOrganizationId: context.organizationId, productId: this.objectId(productId) }).sort({ createdAt: -1 }).lean();
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private async findVersionMine(context: AuthContext, versionId: string) {
    const version = await this.versions.findOne({ _id: this.objectId(versionId), providerOrganizationId: context.organizationId }).lean();
    if (!version) throw new NotFoundException('Product version not found');
    return version;
  }

  private async promoteCurrentVersion(productId: Types.ObjectId, versionId: Types.ObjectId) {
    await this.versions.updateMany(
      { productId, isCurrentVersion: true, _id: { $ne: versionId } },
      { $set: { isCurrentVersion: false } },
    );
    await this.versions.findByIdAndUpdate(versionId, { $set: { isCurrentVersion: true } });
  }

  private extensionFromOriginalName(originalname: string): string {
    const match = /\.([a-zA-Z0-9]+)$/.exec(originalname ?? '');
    return (match?.[1] ?? 'bin').toLowerCase();
  }

  /** The type must exist AND be active for a provider to create a new product of that kind. */
  private async assertActiveType(typeProductId: string): Promise<{ key: string }> {
    const type = await this.types.findById(this.objectId(typeProductId)).select('key isActive').lean();
    if (!type) throw new BadRequestException('Unknown product type');
    if (!type.isActive) throw new BadRequestException('This product type is not available for new products');
    return { key: type.key };
  }

  private async assertPlatform(platformId: string) {
    const active = await this.platforms.findAll({ active: true });
    if (!active.some((p) => p.id === platformId)) {
      throw new BadRequestException('Invalid or inactive platform');
    }
  }

  /** De-dupes and validates every id against the active platform catalogue. */
  private async assertPlatforms(platformIds?: string[]): Promise<Types.ObjectId[]> {
    const ids = [...new Set((platformIds ?? []).filter(Boolean))];
    if (ids.length === 0) return [];
    const active = await this.platforms.findAll({ active: true });
    const activeIds = new Set(active.map((p) => p.id));
    const unknown = ids.filter((id) => !activeIds.has(id));
    if (unknown.length > 0) {
      throw new BadRequestException('One or more platforms are invalid or inactive');
    }
    return ids.map((id) => new Types.ObjectId(id));
  }

  /** Validates indicators belong to the caller's org; only kept when the product type is 'signals'. */
  private async resolveIndicatorIds(context: AuthContext, typeKey: string, indicatorIds?: string[]): Promise<Types.ObjectId[]> {
    if (typeKey !== SIGNALS_TYPE_KEY) return [];
    const ids = [...new Set(indicatorIds ?? [])];
    if (ids.length === 0) return [];
    const owned = await this.indicators
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) }, providerOrganizationId: context.organizationId })
      .select('_id')
      .lean();
    if (owned.length !== ids.length) {
      throw new BadRequestException('One or more indicators do not exist in your organization');
    }
    return owned.map((i) => i._id as Types.ObjectId);
  }

  private normalizeKey(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  /** Trims text fields and cleans string lists on the commercial presentation. */
  private normalizePresentation(dto: ProductPresentationDto): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const textKeys: (keyof ProductPresentationDto)[] = [
      'fullDescription', 'whatItDoes', 'howItWorks', 'howToUse', 'whatYouReceive',
      'documentationUrl', 'supportUrl', 'videoUrl',
    ];
    for (const k of textKeys) {
      if (dto[k] !== undefined) out[k] = String(dto[k] ?? '').trim();
    }
    for (const k of ['features', 'requirements', 'limitations'] as const) {
      if (dto[k] !== undefined) {
        out[k] = (dto[k] ?? []).map((v) => String(v).trim()).filter(Boolean);
      }
    }
    if (dto.faq !== undefined) {
      out.faq = (dto.faq ?? [])
        .map((f) => ({ question: (f.question ?? '').trim(), answer: (f.answer ?? '').trim() }))
        .filter((f) => f.question || f.answer);
    }
    return out;
  }

  /** Validates the provider's param list: reserved keys, duplicates, per-type shape. */
  private normalizeParams(params: ProductParamDto[]) {
    const seen = new Set<string>();
    return params.map((p) => {
      const key = p.key.trim();
      if (RESERVED_PARAM_KEYS.has(key) || key.startsWith('signal.') || key.startsWith('account.') || key.startsWith('meta.')) {
        throw new BadRequestException(`"${key}" is a reserved parameter name`);
      }
      if (seen.has(key)) throw new BadRequestException(`Duplicate parameter "${key}"`);
      seen.add(key);

      const isNumber = p.type === 'number';
      const isList = p.type === 'list';
      if (isList && (!p.options || p.options.length === 0)) {
        throw new BadRequestException(`"${key}" is a list and needs at least one option`);
      }
      return {
        key,
        label: p.label.trim(),
        type: p.type,
        defaultValue: p.defaultValue ?? null,
        required: p.required ?? false,
        repeat: p.repeat === 'once' ? 'once' : 'per-symbol',
        group: p.group?.trim() ?? '',
        min: isNumber && typeof p.min === 'number' ? p.min : null,
        max: isNumber && typeof p.max === 'number' ? p.max : null,
        options: isList ? (p.options ?? []).map((o) => o.trim()).filter(Boolean) : [],
      };
    });
  }
  private objectId(value: string) {
    if (!Types.ObjectId.isValid(value)) throw new BadRequestException('Invalid id');
    return new Types.ObjectId(value);
  }
}
