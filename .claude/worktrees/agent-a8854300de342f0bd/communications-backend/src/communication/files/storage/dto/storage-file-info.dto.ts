export class StorageFileInfoDto {
  key!: string;
  url!: string;
  bucket!: string;
  region!: string;
  contentType!: string;
  size!: number;
  fileName!: string;
  lastModified?: string;
  etag?: string;
}
