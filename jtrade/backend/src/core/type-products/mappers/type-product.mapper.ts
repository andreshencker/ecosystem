import { TypeProductResponseDto } from '../dto/type-product-response.dto';

export class TypeProductMapper {
  static toResponse(doc: any): TypeProductResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    return {
      id: plain._id?.toString?.() ?? String(plain._id),
      key: plain.key,
      name: plain.name,
      description: plain.description,
      isActive: plain.isActive,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  static toResponseList(list: any[]): TypeProductResponseDto[] {
    return list.map((item) => this.toResponse(item));
  }
}
