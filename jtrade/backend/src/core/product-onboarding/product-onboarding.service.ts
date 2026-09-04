import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { AuthContext } from '../auth/types/auth-context';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { ProductPricingService } from '../product-pricing/product-pricing.service';
import { UpdateOnboardingProgressDto } from './dto/onboarding.dto';
import {
  computeCommercialReadiness,
  isSignalProduct,
  REQUIRED_COMMERCIAL_STEPS,
  type CommercialReadiness,
  type CommercialStepKey,
} from './commercial-readiness';

/**
 * Orchestrates the COMMERCIAL Product Onboarding wizard. It does NOT own Product
 * or Pricing data — ProductsService / ProductPricingService do. Its job is:
 *   - compute commercial readiness from real data (the authority),
 *   - persist lightweight wizard progress (currentStep / visitedSteps),
 *   - expose one aggregate read for the wizard shell.
 */
@Injectable()
export class ProductOnboardingService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<ProductDocument>,
    private readonly pricing: ProductPricingService,
  ) {}

  private oid(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid id');
    return new Types.ObjectId(id);
  }

  private async ownedLean(ctx: AuthContext, productId: string) {
    const product = await this.products
      .findOne({ _id: this.oid(productId), providerOrganizationId: ctx.organizationId })
      .populate('typeProductId platformId platformIds indicatorIds')
      .lean();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async getOnboarding(ctx: AuthContext, productId: string) {
    const product = await this.ownedLean(ctx, productId);
    const pricingOptions = await this.pricing
      .list(ctx, productId)
      .catch(() => [] as Array<Record<string, unknown>>);

    const readiness = computeCommercialReadiness({
      product: product as never,
      pricingOptions: pricingOptions as never,
    });

    const progress = product.onboarding ?? {
      currentStep: 1,
      visitedSteps: [1],
      startedAt: product.createdAt ?? new Date(),
      lastActiveAt: product.updatedAt ?? new Date(),
      completedAt: null,
    };

    return {
      product,
      pricingOptions,
      progress,
      readiness,
      /** Where the wizard should open: first incomplete required step, else Review. */
      resumeStep: this.resumeStep(readiness, isSignalProduct(product.typeProductId)),
    };
  }

  async saveProgress(ctx: AuthContext, productId: string, dto: UpdateOnboardingProgressDto) {
    const product = await this.products.findOne({
      _id: this.oid(productId),
      providerOrganizationId: ctx.organizationId,
    });
    if (!product) throw new NotFoundException('Product not found');

    const ob = product.onboarding ?? ({} as ProductDocument['onboarding']);
    if (dto.currentStep !== undefined) ob.currentStep = dto.currentStep;
    if (dto.visitedSteps !== undefined) {
      ob.visitedSteps = [...new Set([...(ob.visitedSteps ?? []), ...dto.visitedSteps])]
        .filter((n) => n >= 1 && n <= 9)
        .sort((a, b) => a - b);
    }
    ob.lastActiveAt = new Date();
    product.onboarding = ob;
    product.updatedByGrapiflyUserId = ctx.grapiflyUserId;
    await product.save();

    return this.getOnboarding(ctx, productId);
  }

  /** Confirms commercial readiness and stamps completedAt (once). Never publishes. */
  async complete(ctx: AuthContext, productId: string) {
    const current = await this.getOnboarding(ctx, productId);
    if (!current.readiness.ready) {
      throw new BadRequestException(
        `Product is not commercially ready — missing: ${current.readiness.missing.join(', ')}`,
      );
    }
    if (!current.product.onboarding?.completedAt) {
      await this.products.updateOne(
        { _id: this.oid(productId), providerOrganizationId: ctx.organizationId },
        {
          $set: {
            'onboarding.completedAt': new Date(),
            // Review's own step number — 8 normally, 9 for Signal products
            // (Alert Setup inserted before it). Never hardcoded.
            'onboarding.currentStep': current.readiness.steps.review.step,
          },
        },
      );
    }
    return this.getOnboarding(ctx, productId);
  }

  /**
   * Wizard step to resume at. Step 1 is Product Type (always satisfied for a
   * persisted product). Walks the required steps for this product's type in
   * order and returns the first incomplete one's own wizard step number —
   * Signal products additionally require Alert Setup. Falls back to Review
   * (always the last step) once everything required is done.
   */
  private resumeStep(readiness: CommercialReadiness, isSignal: boolean): number {
    const required: CommercialStepKey[] = isSignal
      ? [...REQUIRED_COMMERCIAL_STEPS, 'alertSetup']
      : REQUIRED_COMMERCIAL_STEPS;
    for (const key of required) {
      if (!readiness.steps[key].complete) return readiness.steps[key].step;
    }
    return readiness.steps.review.step;
  }
}
