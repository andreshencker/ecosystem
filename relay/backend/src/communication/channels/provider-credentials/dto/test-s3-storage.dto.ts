// src/channels/provider-credentials/dto/test-s3-storage.dto.ts
import {
  IsBoolean,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class TestS3StorageDto {
  @IsMongoId()
  companyChannelProviderId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  tag!: string;

  // key dentro del bucket (ej: "tests/ping.txt")
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  key!: string;

  // contenido base64 (ej: Buffer.from("hello").toString("base64"))
  @IsString()
  @MinLength(1)
  contentBase64!: string;

  // ej: "text/plain" | "application/pdf" | "image/png"
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  contentType!: string;

  // opcional: si quieres probar ACL public-read (solo si tu bucket/policy lo permite)
  @IsOptional()
  @IsBoolean()
  aclPublicRead?: boolean;
}
