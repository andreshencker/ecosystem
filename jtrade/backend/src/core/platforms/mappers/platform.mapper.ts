import { PlatformResponseDto } from '../dto/platform-response.dto';
import { Platform } from '../schemas/platform.schema';

type PlatformLike = Partial<Platform> & {
  _id?: any;
  id?: any;
  createdAt?: Date;
  updatedAt?: Date;
};

export class PlatformMapper {
  static toResponse(doc: PlatformLike): PlatformResponseDto {
    if (!doc) {
      // Nunca debería llamarse con null si validas antes
      throw new Error('PlatformMapper.toResponse called with null/undefined');
    }

    return {
      id: String(doc._id ?? doc.id),
      name: doc.name!,
      category: doc.category!,
      connectionType: doc.connectionType!,
      imageUrl: doc.imageUrl,
      isActive: doc.isActive!,
      isSupported: doc.isSupported!,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toResponseList(docs: PlatformLike[]): PlatformResponseDto[] {
    return docs.map((d) => this.toResponse(d));
  }
}
