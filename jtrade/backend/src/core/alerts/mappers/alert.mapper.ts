import { AlertResponseDto } from '../dto/alert-response.dto';

export class AlertMapper {
  static toResponse(doc: any): AlertResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    const indicatorProject = plain.indicatorProject ?? plain.indicatorProjectId;
    const symbolData = plain.symbolData ?? plain.symbolId;

    const indicator =
      indicatorProject?.indicator ?? indicatorProject?.indicatorId;

    const projectCodePlatform =
      indicatorProject?.projectCodePlatform ??
      indicatorProject?.projectCodePlatformId;

    const companyProvider =
      indicatorProject?.companyProvider ?? indicatorProject?.companyProviderId;

    const codeProject =
      projectCodePlatform?.codeProject ?? projectCodePlatform?.codeProjectId;

    const platform =
      projectCodePlatform?.platform ?? projectCodePlatform?.platformId;

    return {
      id: String(plain._id ?? plain.id),

      groupId: String(plain.groupId ?? ''),

      indicatorProjectId: String(
        indicatorProject?._id ??
          indicatorProject?.id ??
          plain.indicatorProjectId ??
          '',
      ),

      symbolId: String(
        symbolData?._id ?? symbolData?.id ?? plain.symbolId ?? '',
      ),

      symbol: plain.symbol,
      timeFrame: plain.timeFrame,
      action: plain.action,

      isActive: !!plain.isActive,

      symbolData:
        symbolData && typeof symbolData === 'object'
          ? {
              id: String(symbolData._id ?? symbolData.id),
              symbol: symbolData.symbol,
              isActive: symbolData.isActive,
              companyProviderId: String(symbolData.companyProviderId ?? ''),
            }
          : null,

      indicatorProject: indicatorProject
        ? {
            id: String(indicatorProject._id ?? indicatorProject.id),
            isActive: indicatorProject.isActive,
            notes: indicatorProject.notes,

            indicator: indicator
              ? {
                  id: String(indicator._id ?? indicator.id),
                  name: indicator.name,
                  key: indicator.key,
                  description: indicator.description,
                  isActive: indicator.isActive,
                }
              : undefined,

            projectCodePlatform: projectCodePlatform
              ? {
                  id: String(projectCodePlatform._id ?? projectCodePlatform.id),
                  deliveryMode: projectCodePlatform.deliveryMode,
                  runtimeMode: projectCodePlatform.runtimeMode,
                  status: projectCodePlatform.status,
                  isActive: projectCodePlatform.isActive,

                  codeProject: codeProject
                    ? {
                        id: String(codeProject._id ?? codeProject.id),
                        name: codeProject.name,
                        projectKey: codeProject.projectKey,
                        isActive: codeProject.isActive,
                      }
                    : undefined,

                  platform: platform
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

            companyProvider: companyProvider
              ? {
                  id: String(companyProvider._id ?? companyProvider.id),
                  companyName: companyProvider.companyName,
                  status: companyProvider.status,
                  isVerified: companyProvider.isVerified,
                  isActive: companyProvider.isActive,
                }
              : undefined,
          }
        : null,

      createdAt: plain.createdAt
        ? new Date(plain.createdAt).toISOString()
        : undefined,

      updatedAt: plain.updatedAt
        ? new Date(plain.updatedAt).toISOString()
        : undefined,
    };
  }

  static toResponseList(docs: any[]): AlertResponseDto[] {
    return (docs ?? []).map((doc) => this.toResponse(doc));
  }
}
