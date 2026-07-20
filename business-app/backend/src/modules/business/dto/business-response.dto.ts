/**
 * BusinessResponseDto — typed response for the /company endpoints.
 *
 * Maps the MongoDB `_id` ObjectId to the `id: string` field expected by the
 * frontend Business type. All controllers in BusinessModule must return this
 * DTO instead of the raw Mongoose lean document.
 */
export class BusinessResponseDto {
  /** Canonical string ID (mapped from MongoDB _id). */
  id!: string;
  businessKey!: string;
  businessName!: string;
  ownerUserId!: string | null;
  abn!: string | null;
  depositAccount!: { bsb: string | null; accountNumber: string | null };
  defaultCurrency!: string;
  isActive!: boolean;
  isPlatformCompany!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static from(doc: Record<string, any>): BusinessResponseDto {
    const dto = new BusinessResponseDto();
    dto.id = String(doc._id ?? doc.id);
    dto.businessKey = doc.businessKey ?? '';
    dto.businessName = doc.businessName ?? '';
    dto.ownerUserId = doc.ownerUserId ?? null;
    dto.abn = doc.abn ?? null;
    dto.depositAccount = doc.depositAccount ?? { bsb: null, accountNumber: null };
    dto.defaultCurrency = doc.defaultCurrency ?? 'AUD';
    dto.isActive = doc.isActive ?? true;
    dto.isPlatformCompany = doc.isPlatformCompany ?? false;
    dto.createdAt = doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : String(doc.createdAt ?? '');
    dto.updatedAt = doc.updatedAt instanceof Date
      ? doc.updatedAt.toISOString()
      : String(doc.updatedAt ?? '');
    return dto;
  }
}
