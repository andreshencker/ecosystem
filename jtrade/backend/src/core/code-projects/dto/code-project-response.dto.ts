import { CodeProjectStatus } from '../schemas/code-project.schema';

export class CodeProjectResponseDto {
  id!: string;

  companyProviderId!: string;
  typeProjectId!: string;

  projectKey!: string;
  name!: string;
  description?: string;

  status!: CodeProjectStatus;
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;

  companyProvider?: {
    id: string;
    companyName: string;
  };

  typeProject?: {
    id: string;
    key: string;
    name: string;
  };
}
