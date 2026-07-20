import { ProjectCodePlatformResponseDto } from '../dto/project-code-platform-response.dto';

export class ProjectCodePlatformMapper {
  static toResponse(doc: any): ProjectCodePlatformResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    return {
      id: plain._id?.toString?.() ?? String(plain._id),

      codeProjectId:
        plain.codeProjectId?._id?.toString?.() ??
        plain.codeProjectId?.toString?.() ??
        String(plain.codeProjectId),

      platformId:
        plain.platformId?._id?.toString?.() ??
        plain.platformId?.toString?.() ??
        String(plain.platformId),

      deliveryMode: plain.deliveryMode,
      runtimeMode: plain.runtimeMode,
      status: plain.status,

      isActive: !!plain.isActive,
      notes: plain.notes ?? '',

      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,

      codeProject: plain.codeProject
        ? {
            id:
              plain.codeProject._id?.toString?.() ??
              String(plain.codeProject._id),
            projectKey: plain.codeProject.projectKey,
            name: plain.codeProject.name,
            companyProviderId:
              plain.codeProject.companyProviderId?.toString?.() ??
              String(plain.codeProject.companyProviderId),
          }
        : undefined,

      platform: plain.platform
        ? {
            id: plain.platform._id?.toString?.() ?? String(plain.platform._id),
            name: plain.platform.name,
            category: plain.platform.category,
            imageUrl: plain.platform.imageUrl,
            isActive: plain.platform.isActive,
            isSupported: plain.platform.isSupported,
            connectionType: plain.platform.connectionType,
          }
        : undefined,
    };
  }

  static toResponseList(list: any[]): ProjectCodePlatformResponseDto[] {
    return (list ?? []).map((item) => this.toResponse(item));
  }
}
