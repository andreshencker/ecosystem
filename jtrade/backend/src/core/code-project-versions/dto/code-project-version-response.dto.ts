export type CodeProjectVersionProjectCodePlatformMiniDto = {
  id: string;
  deliveryMode: string;
  runtimeMode: string;
  status: string;
  isActive: boolean;
};

export type CodeProjectVersionCodeProjectMiniDto = {
  id: string;
  projectKey: string;
  name: string;
  status?: string;
  isActive: boolean;
};

export type CodeProjectVersionCompanyProviderMiniDto = {
  id: string;
  companyName: string;
};

export type CodeProjectVersionPlatformMiniDto = {
  id: string;
  name: string;
  category: string;
  connectionType: string;
  imageUrl?: string;
  isActive: boolean;
  isSupported: boolean;
};

export class CodeProjectVersionResponseDto {
  id!: string;

  projectCodePlatformId!: string;
  codeProjectId!: string;
  companyProviderId!: string;
  platformId!: string;

  projectKey!: string;

  version!: string;
  fileName!: string;
  originalFileName?: string;
  extension!: string;
  fileKey!: string;

  size!: number;
  contentType!: string;

  comments?: string;

  isCurrentVersion!: boolean;
  isActive!: boolean;

  projectCodePlatform?: CodeProjectVersionProjectCodePlatformMiniDto;
  codeProject?: CodeProjectVersionCodeProjectMiniDto;
  companyProvider?: CodeProjectVersionCompanyProviderMiniDto;
  platform?: CodeProjectVersionPlatformMiniDto;

  createdAt!: Date;
  updatedAt!: Date;
}
