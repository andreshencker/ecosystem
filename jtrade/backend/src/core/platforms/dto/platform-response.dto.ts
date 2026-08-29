export class PlatformResponseDto {
  id!: string;
  key!: string;
  name!: string;
  description!: string;
  logoUrl!: string;
  isActive!: boolean;
  isSupported!: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
