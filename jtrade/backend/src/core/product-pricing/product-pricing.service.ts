import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthContext } from '../auth/types/auth-context';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { CreateProductPricingDto, PricingPromotionDto, UpdateProductPricingDto } from './dto/pricing.dto';
import { ProductPricing, ProductPricingDocument } from './schemas/product-pricing.schema';

@Injectable()
export class ProductPricingService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(ProductPricing.name) private readonly pricing: Model<ProductPricingDocument>,
  ) {}

  private objectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    return new Types.ObjectId(id);
  }

  private async assertProduct(ctx: AuthContext, productId: string): Promise<Types.ObjectId> {
    const product = await this.products.findOne({ _id: this.objectId(productId), providerOrganizationId: ctx.organizationId }).select('_id').lean();
    if (!product) throw new NotFoundException('Product not found');
    return product._id as Types.ObjectId;
  }

  private async assertReadableProduct(ctx: AuthContext, productId: string): Promise<Types.ObjectId> {
    const product = await this.products.findOne({
      _id: this.objectId(productId),
      $or: [{ providerOrganizationId: ctx.organizationId }, { status: 'published' }],
    }).select('_id').lean();
    if (!product) throw new NotFoundException('Product not found');
    return product._id as Types.ObjectId;
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid promotion date');
    return date;
  }

  private normalizePromotion(promotion?: PricingPromotionDto | null) {
    if (!promotion) return null;
    const startsAt = this.parseDate(promotion.startsAt);
    const endsAt = this.parseDate(promotion.endsAt);
    if (startsAt && endsAt && startsAt >= endsAt) throw new BadRequestException('Promotion end must be after its start');
    if (promotion.type === 'percentage' && promotion.value > 100) throw new BadRequestException('A percentage discount cannot exceed 100');
    return { type: promotion.type, value: promotion.value, startsAt, endsAt, isActive: promotion.isActive ?? true };
  }

  private validateOption(option: {
    pricingType: 'one_time' | 'recurring'; amount: number; interval?: 'month' | 'year' | null;
    intervalCount?: number | null; trialEnabled?: boolean; trialDays?: number;
    promotion?: { type: 'percentage' | 'fixed_amount' | 'direct_price'; value: number } | null;
  }) {
    if (option.pricingType === 'recurring' && (!option.interval || !option.intervalCount)) {
      throw new BadRequestException('Recurring pricing requires interval and intervalCount');
    }
    if (option.trialEnabled && option.amount === 0) throw new BadRequestException('A free price does not need a trial');
    if (option.trialEnabled && (!option.trialDays || option.trialDays < 1)) throw new BadRequestException('trialDays must be at least 1');
    if (option.promotion?.type === 'direct_price' && option.promotion.value > option.amount) {
      throw new BadRequestException('Promotional price cannot exceed the base price');
    }
  }

  present<T extends Record<string, any>>(option: T, now = new Date()) {
    const promotion = option.promotion ?? null;
    const active = !!promotion?.isActive
      && (!promotion.startsAt || new Date(promotion.startsAt) <= now)
      && (!promotion.endsAt || new Date(promotion.endsAt) >= now);
    let effectiveAmount = option.amount;
    if (active) {
      if (promotion.type === 'percentage') effectiveAmount = Math.max(0, option.amount - Math.round(option.amount * promotion.value / 100));
      else if (promotion.type === 'fixed_amount') effectiveAmount = Math.max(0, option.amount - promotion.value);
      else effectiveAmount = promotion.value;
    }
    return { ...option, hasActivePromotion: active, discountAmount: option.amount - effectiveAmount, effectiveAmount };
  }

  async list(ctx: AuthContext, productId: string) {
    const pid = await this.assertReadableProduct(ctx, productId);
    const providerOwnsProduct = await this.products.exists({ _id: pid, providerOrganizationId: ctx.organizationId });
    const rows = await this.pricing.find({ productId: pid, ...(providerOwnsProduct ? {} : { status: 'active' }) })
      .sort({ isDefault: -1, displayOrder: 1, createdAt: 1 }).lean();
    return rows.map((row) => this.present(row));
  }

  async create(ctx: AuthContext, productId: string, dto: CreateProductPricingDto) {
    const pid = await this.assertProduct(ctx, productId);
    this.validateOption(dto);
    const promotion = this.normalizePromotion(dto.promotion);
    if (dto.isDefault) await this.pricing.updateMany({ productId: pid, isDefault: true }, { $set: { isDefault: false } });
    try {
      const created = await this.pricing.create({
        productId: pid, providerOrganizationId: ctx.organizationId, key: dto.key.trim().toLowerCase(), name: dto.name.trim(),
        pricingType: dto.pricingType, amount: dto.amount, currency: 'USD',
        interval: dto.pricingType === 'recurring' ? dto.interval : null,
        intervalCount: dto.pricingType === 'recurring' ? dto.intervalCount : null,
        trialEnabled: dto.amount > 0 && (dto.trialEnabled ?? false), trialDays: dto.trialEnabled ? dto.trialDays : 0,
        promotion, status: dto.status ?? 'active', isDefault: dto.isDefault ?? false, displayOrder: dto.displayOrder ?? 0,
        createdByGrapiflyUserId: ctx.grapiflyUserId, updatedByGrapiflyUserId: ctx.grapiflyUserId,
      });
      return this.present(created.toObject());
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('Pricing key already exists for this product');
      throw error;
    }
  }

  async update(ctx: AuthContext, productId: string, pricingId: string, dto: UpdateProductPricingDto) {
    const pid = await this.assertProduct(ctx, productId);
    const existing = await this.pricing.findOne({ _id: this.objectId(pricingId), productId: pid }).lean();
    if (!existing) throw new NotFoundException('Pricing option not found');
    const merged = { ...existing, ...dto };
    this.validateOption(merged);
    const patch: Record<string, unknown> = { ...dto, updatedByGrapiflyUserId: ctx.grapiflyUserId };
    if (dto.key !== undefined) patch.key = dto.key.trim().toLowerCase();
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.promotion !== undefined) patch.promotion = this.normalizePromotion(dto.promotion);
    if (merged.pricingType === 'one_time') { patch.interval = null; patch.intervalCount = null; }
    if (!merged.trialEnabled) patch.trialDays = 0;
    if (dto.isDefault) await this.pricing.updateMany({ productId: pid, isDefault: true, _id: { $ne: existing._id } }, { $set: { isDefault: false } });
    try {
      const updated = await this.pricing.findOneAndUpdate({ _id: existing._id }, { $set: patch }, { new: true }).lean();
      return this.present(updated!);
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('Pricing key already exists for this product');
      throw error;
    }
  }

  async deactivate(ctx: AuthContext, productId: string, pricingId: string) {
    const pid = await this.assertProduct(ctx, productId);
    const updated = await this.pricing.findOneAndUpdate(
      { _id: this.objectId(pricingId), productId: pid },
      { $set: { status: 'inactive', isDefault: false, updatedByGrapiflyUserId: ctx.grapiflyUserId } },
      { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Pricing option not found');
    return this.present(updated);
  }

  async overview(ctx: AuthContext) {
    const products = await this.products.find({ providerOrganizationId: ctx.organizationId })
      .select('_id name key status typeProductId platformId updatedAt').populate('typeProductId platformId').sort({ updatedAt: -1 }).lean();
    const ids = products.map((product) => product._id);
    const options = await this.pricing.find({ productId: { $in: ids } }).sort({ isDefault: -1, displayOrder: 1 }).lean();
    const byProduct = new Map<string, any[]>();
    for (const option of options) {
      const key = String(option.productId);
      byProduct.set(key, [...(byProduct.get(key) ?? []), this.present(option)]);
    }
    return products.map((product) => ({ product, options: byProduct.get(String(product._id)) ?? [] }));
  }
}
