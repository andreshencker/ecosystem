import { AdminIndicatorResponseDto } from '../dto/admin-indicator-response.dto';

export class AdminIndicatorMapper {
  static toResponse(doc: any): AdminIndicatorResponseDto {
    if (!doc) {
      throw new Error(
        'AdminIndicatorMapper.toResponse called with null/undefined',
      );
    }

    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    const ip = plain.indicatorProjectId;
    const indicator = ip?.indicatorId;
    const projectCodePlatform = ip?.projectCodePlatformId;
    const companyProvider = ip?.companyProviderId;

    const codeProject = projectCodePlatform?.codeProjectId;
    const platform = projectCodePlatform?.platformId;

    return {
      id: String(plain._id ?? plain.id),

      indicatorProjectId: String(ip?._id ?? plain.indicatorProjectId),

      webhookKey: plain.webhookKey ?? '',
      isActive: plain.isActive !== false,

      indicatorProject:
        ip && typeof ip === 'object'
          ? {
              id: String(ip._id ?? ip.id),
              isActive: ip.isActive,
              notes: ip.notes,

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

              projectCodePlatform:
                projectCodePlatform && typeof projectCodePlatform === 'object'
                  ? {
                      id: String(
                        projectCodePlatform._id ?? projectCodePlatform.id,
                      ),
                      deliveryMode: projectCodePlatform.deliveryMode,
                      runtimeMode: projectCodePlatform.runtimeMode,
                      status: projectCodePlatform.status,
                      isActive: projectCodePlatform.isActive,

                      codeProject:
                        codeProject && typeof codeProject === 'object'
                          ? {
                              id: String(codeProject._id ?? codeProject.id),
                              name: codeProject.name,
                              projectKey: codeProject.projectKey,
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
            }
          : undefined,

      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  static toResponseList(docs: any[]): AdminIndicatorResponseDto[] {
    return (docs ?? []).map((doc) => this.toResponse(doc));
  }
}
