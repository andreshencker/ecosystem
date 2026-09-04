export class TypeProductResponseDto {
  id!: string;
  key!: string;
  name!: string;
  shortDescription!: string;
  description!: string;
  iconUrl!: string;
  isActive!: boolean;
  displayOrder!: number;
  createdByGrapiflyUserId?: string;
  updatedByGrapiflyUserId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
