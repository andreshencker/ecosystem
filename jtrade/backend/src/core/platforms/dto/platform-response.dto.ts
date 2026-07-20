import { ConnectionType, PlatformCategory } from '../schemas/platform.schema';

export class PlatformResponseDto {
  id: string;
  name: string;
  category: PlatformCategory;
  connectionType: ConnectionType;
  imageUrl?: string;
  isActive: boolean;
  isSupported: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
