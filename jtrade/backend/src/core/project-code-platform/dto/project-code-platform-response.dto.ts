import {
  ProjectCodePlatformStatus,
  ProjectDeliveryMode,
  ProjectRuntimeMode,
} from '../schemas/project-code-platform.schema';

export class ProjectCodePlatformResponseDto {
  id!: string;

  codeProjectId!: string;
  platformId!: string;

  deliveryMode!: ProjectDeliveryMode;
  runtimeMode!: ProjectRuntimeMode;
  status!: ProjectCodePlatformStatus;

  isActive!: boolean;
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;

  codeProject?: {
    id: string;
    projectKey: string;
    name: string;
    companyProviderId?: string;
  };

  platform?: {
    id: string;
    name: string;
    category?: string;
    imageUrl?: string;
    isActive?: boolean;
    isSupported?: boolean;
    connectionType?: string;
  };
}
