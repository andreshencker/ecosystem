import { PlatformResponseDto } from '../dto/platform-response.dto';

export class PlatformMapper {
  static toResponse(doc: any): PlatformResponseDto {
    return {
      id: String(doc._id),
      key: String(doc.key ?? ''),
      name: String(doc.name ?? ''),
      description: String(doc.description ?? ''),
      websiteUrl: String(doc.websiteUrl ?? ''),
      logoUrl: String(doc.logoUrl ?? ''),
      isActive: !!doc.isActive,
      displayOrder: Number(doc.displayOrder ?? 0),
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  static toResponseList(list: any[]): PlatformResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
