import { IndicatorProjectResponseDto } from '../dto/indicator-project-response.dto';

export class IndicatorProjectMapper {
  static toResponse(doc: any): IndicatorProjectResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    const companyProvider = plain.companyProvider ?? plain.companyProviderId;

    const projectCodePlatform =
      plain.projectCodePlatform ?? plain.projectCodePlatformId;

    const indicator = plain.indicator ?? plain.indicatorId;

    const codeProject =
      projectCodePlatform?.codeProject ?? projectCodePlatform?.codeProjectId;

    const platform =
      projectCodePlatform?.platform ?? projectCodePlatform?.platformId;

    return {
      id: String(plain._id ?? plain.id),

      companyProviderId: String(
        companyProvider?._id ?? companyProvider?.id ?? plain.companyProviderId,
      ),

      projectCodePlatformId: String(
        projectCodePlatform?._id ??
          projectCodePlatform?.id ??
          plain.projectCodePlatformId,
      ),

      indicatorId: String(indicator?._id ?? indicator?.id ?? plain.indicatorId),

      isActive: plain.isActive !== false,
      notes: plain.notes ?? '',

      companyProvider:
        companyProvider && typeof companyProvider === 'object'
          ? {
              id: String(companyProvider._id ?? companyProvider.id),
              companyName: companyProvider.companyName,
              status: companyProvider.status,
              isVerified: companyProvider.isVerified,
              isActive: companyProvider.isActive,
            }
          : undefined,

      projectCodePlatform:
        projectCodePlatform && typeof projectCodePlatform === 'object'
          ? {
              id: String(projectCodePlatform._id ?? projectCodePlatform.id),
              deliveryMode: projectCodePlatform.deliveryMode,
              runtimeMode: projectCodePlatform.runtimeMode,
              status: projectCodePlatform.status,
              isActive: projectCodePlatform.isActive,
              notes: projectCodePlatform.notes,

              codeProject:
                codeProject && typeof codeProject === 'object'
                  ? {
                      id: String(codeProject._id ?? codeProject.id),
                      name: codeProject.name,
                      projectKey: codeProject.projectKey,
                      description: codeProject.description,
                      isActive: codeProject.isActive,
                    }
                  : undefined,

              platform:
                platform && typeof platform === 'object'
                  ? {
                      id: String(platform._id ?? platform.id),
                      name: platform.name,
                      category: platform.category,
                      connectionType: platform.connectionType,
                      imageUrl: platform.imageUrl,
                      isActive: platform.isActive,
                      isSupported: platform.isSupported,
                    }
                  : undefined,
            }
          : undefined,

      indicator:
        indicator && typeof indicator === 'object'
          ? {
              id: String(indicator._id ?? indicator.id),
              name: indicator.name,
              key: indicator.key,
              description: indicator.description,
              isActive: indicator.isActive,
            }
          : undefined,

      createdAt: plain.createdAt
        ? new Date(plain.createdAt).toISOString()
        : undefined,

      updatedAt: plain.updatedAt
        ? new Date(plain.updatedAt).toISOString()
        : undefined,
    };
  }

  static toResponseList(docs: any[]): IndicatorProjectResponseDto[] {
    return (docs ?? []).map((doc) => this.toResponse(doc));
  }
}
