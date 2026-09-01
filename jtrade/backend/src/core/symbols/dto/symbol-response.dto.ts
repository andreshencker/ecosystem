export class SymbolResponseDto {
  id!: string;
  providerOrganizationId!: string;
  symbol!: string;
  aliases!: string[];
  isActive!: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
