import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthContext } from '../auth/types/auth-context';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { ProductPricing, ProductPricingDocument } from '../product-pricing/schemas/product-pricing.schema';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orders: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    @InjectModel(ProductPricing.name) private readonly pricing: Model<ProductPricingDocument>,
  ) {}

  private objectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    return new Types.ObjectId(id);
  }

  private effective(option: ProductPricingDocument | any) {
    const now = new Date();
    const promotion = option.promotion;
    const active = !!promotion?.isActive
      && (!promotion.startsAt || new Date(promotion.startsAt) <= now)
      && (!promotion.endsAt || new Date(promotion.endsAt) >= now);
    if (!active) return { effectiveAmount: option.amount, discountAmount: 0, promotion: null };
    let effectiveAmount = option.amount;
    if (promotion.type === 'percentage') effectiveAmount = Math.max(0, option.amount - Math.round(option.amount * promotion.value / 100));
    else if (promotion.type === 'fixed_amount') effectiveAmount = Math.max(0, option.amount - promotion.value);
    else effectiveAmount = promotion.value;
    return { effectiveAmount, discountAmount: option.amount - effectiveAmount, promotion };
  }

  async checkout(ctx: AuthContext, productId: string, pricingId: string) {
    const product = await this.products.findOne({ _id: this.objectId(productId), status: 'published' }).lean();
    if (!product) throw new NotFoundException('Product not available');
    const option = await this.pricing.findOne({ _id: this.objectId(pricingId), productId: product._id, status: 'active' }).lean();
    if (!option) throw new BadRequestException('Pricing option is not available');
    const existing = await this.orders.exists({ productId: product._id, clientGrapiflyUserId: ctx.grapiflyUserId, status: 'active' });
    if (existing) throw new ConflictException('You already have an active order for this product');

    const hadPriorOrder = await this.orders.exists({ productId: product._id, clientGrapiflyUserId: ctx.grapiflyUserId });
    const trialActive = option.amount > 0 && option.trialEnabled && option.trialDays > 0 && !hadPriorOrder;
    const locked = this.effective(option);
    const now = new Date();
    let trialEndsAt: Date | null = null;
    if (trialActive) {
      trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + option.trialDays);
    }
    let currentPeriodEnd: Date | null = null;
    if (option.pricingType === 'recurring') {
      currentPeriodEnd = trialEndsAt ?? new Date(now);
      if (!trialEndsAt) {
        const count = option.intervalCount ?? 1;
        if (option.interval === 'year') currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + count);
        else currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + count);
      }
    }

    return this.orders.create({
      productId: product._id, providerOrganizationId: product.providerOrganizationId,
      clientGrapiflyUserId: ctx.grapiflyUserId, clientOrganizationId: ctx.organizationId,
      pricingId: option._id, pricingKey: option.key, pricingName: option.name,
      baseAmount: option.amount, discountAmount: locked.discountAmount,
      amountPaid: trialActive ? 0 : locked.effectiveAmount, currency: option.currency,
      pricingType: option.pricingType, interval: option.interval, intervalCount: option.intervalCount,
      promotionType: locked.promotion?.type ?? null, promotionValue: locked.promotion?.value ?? null,
      status: 'active', startedAt: now, currentPeriodEnd, isTrial: trialActive, trialEndsAt,
    });
  }

  listMine(ctx: AuthContext) {
    return this.orders.find({ clientGrapiflyUserId: ctx.grapiflyUserId })
      .populate({ path: 'productId', select: 'name key typeProductId platformId' }).sort({ createdAt: -1 }).lean();
  }

  listSales(ctx: AuthContext) {
    return this.orders.find({ providerOrganizationId: ctx.organizationId })
      .populate({ path: 'productId', select: 'name key typeProductId platformId' }).sort({ createdAt: -1 }).lean();
  }

  async cancel(ctx: AuthContext, id: string) {
    const updated = await this.orders.findOneAndUpdate(
      { _id: this.objectId(id), clientGrapiflyUserId: ctx.grapiflyUserId, status: 'active' },
      { $set: { status: 'cancelled', cancelledAt: new Date() } }, { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Active order not found');
    return updated;
  }
}
