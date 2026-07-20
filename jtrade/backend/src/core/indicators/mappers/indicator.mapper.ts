import { IndicatorResponseDto } from '../dto/indicator-response.dto';

type IndicatorLike = {
  _id?: any;
  id?: any;

  companyProviderId?: any;

  name?: string;
  key?: string;
  description?: string;
  isActive?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
};

export class IndicatorMapper {
  static toResponse(doc: IndicatorLike): IndicatorResponseDto {
    if (!doc) {
      throw new Error('IndicatorMapper.toResponse called with null/undefined');
    }

    const companyProvider =
      doc.companyProviderId && typeof doc.companyProviderId === 'object'
        ? doc.companyProviderId
        : null;

    return {
      id: String(doc._id ?? doc.id),

      companyProviderId: String(
        companyProvider?._id ?? doc.companyProviderId ?? '',
      ),

      name: doc.name ?? '',
      key: doc.key ?? '',
      description: doc.description ?? '',

      isActive: !!doc.isActive,

      companyProvider: companyProvider
        ? {
            id: String(companyProvider._id),
            companyName: String(companyProvider.companyName ?? ''),
            email: companyProvider.email,
            status: companyProvider.status,
            isVerified: companyProvider.isVerified,
            isActive: companyProvider.isActive,
          }
        : undefined,

      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toResponseList(docs: IndicatorLike[]): IndicatorResponseDto[] {
    return (docs ?? []).map((d) => this.toResponse(d));
  }
}
