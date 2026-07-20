import { IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreviewByEventKeyDto {
  @ApiProperty({ example: '665f1a2b3c4d5e6f7a8b9c0d' })
  @IsMongoId()
  companyId!: string;

  @ApiProperty({ example: 'security.user_invitation' })
  @IsString()
  @IsNotEmpty()
  canonicalEventKey!: string;

  @ApiPropertyOptional({ description: 'Runtime variables — data.* namespace', example: { firstName: 'Alice' } })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
