import { TypeProductResponseDto } from '../dto/type-product-response.dto';

export class TypeProductMapper {
  static toResponse(doc: any): TypeProductResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    return {
      id: plain._id?.toString?.() ?? String(plain._id),
      key: plain.key,
      name: plain.name,
      shortDescription: plain.shortDescription ?? '',
      description: plain.description ?? '',
      iconUrl: plain.iconUrl ?? '',
      isActive: !!plain.isActive,
      displayOrder: typeof plain.displayOrder === 'number' ? plain.displayOrder : 0,
      createdByGrapiflyUserId: plain.createdByGrapiflyUserId ?? '',
      updatedByGrapiflyUserId: plain.updatedByGrapiflyUserId ?? '',
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  static toResponseList(list: any[]): TypeProductResponseDto[] {
    return list.map((item) => this.toResponse(item));
  }
}
