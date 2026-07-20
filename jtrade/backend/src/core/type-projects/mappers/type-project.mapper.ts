import { TypeProjectResponseDto } from '../dto/type-project-response.dto';

export class TypeProjectMapper {
  static toResponse(doc: any): TypeProjectResponseDto {
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

  static toResponseList(list: any[]): TypeProjectResponseDto[] {
    return list.map((item) => this.toResponse(item));
  }
}
