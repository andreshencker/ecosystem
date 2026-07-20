import { CompanyProviderResponseDto } from '../dto/company-provider-response.dto';

export class CompanyProviderMapper {
  static toResponse(doc: any): CompanyProviderResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    return {
      id: plain._id?.toString?.() ?? String(plain._id),

      ownerUserId:
        plain.ownerUserId?._id?.toString?.() ??
        plain.ownerUserId?.toString?.() ??
        String(plain.ownerUserId),

      companyName: plain.companyName,
      legalName: plain.legalName,
      email: plain.email,
      phone: plain.phone,
      website: plain.website,
      logoUrl: plain.logoUrl,
      description: plain.description,

      status: plain.status,

      isVerified: plain.isVerified,
      isActive: plain.isActive,

      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  static toResponseList(list: any[]): CompanyProviderResponseDto[] {
    return list.map((item) => this.toResponse(item));
  }
}
