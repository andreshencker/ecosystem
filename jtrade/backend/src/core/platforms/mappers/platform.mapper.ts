import { PlatformResponseDto } from '../dto/platform-response.dto';

export class PlatformMapper {
  static toResponse(doc: any): PlatformResponseDto {
    return {
      id: String(doc._id),
      key: String(doc.key ?? ''),
      name: String(doc.name ?? ''),
      description: String(doc.description ?? ''),
      logoUrl: String(doc.logoUrl ?? ''),
      isActive: !!doc.isActive,
      isSupported: !!doc.isSupported,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toResponseList(list: any[]): PlatformResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
