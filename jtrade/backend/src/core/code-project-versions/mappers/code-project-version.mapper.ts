import { CodeProjectVersionResponseDto } from '../dto/code-project-version-response.dto';

export class CodeProjectVersionMapper {
  static toResponse(doc: any): CodeProjectVersionResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    const projectCodePlatformPopulated =
      plain?.projectCodePlatformId &&
      typeof plain.projectCodePlatformId === 'object' &&
      plain.projectCodePlatformId._id;

    const codeProjectPopulated =
      plain?.codeProjectId &&
      typeof plain.codeProjectId === 'object' &&
      plain.codeProjectId._id;

    const companyProviderPopulated =
      plain?.companyProviderId &&
      typeof plain.companyProviderId === 'object' &&
      plain.companyProviderId._id;

    const platformPopulated =
      plain?.platformId &&
      typeof plain.platformId === 'object' &&
      plain.platformId._id;

    return {
      id: plain._id?.toString?.() ?? String(plain._id),

      projectCodePlatformId: projectCodePlatformPopulated
        ? String(plain.projectCodePlatformId._id)
        : String(plain.projectCodePlatformId),

      codeProjectId: codeProjectPopulated
        ? String(plain.codeProjectId._id)
        : String(plain.codeProjectId),

      companyProviderId: companyProviderPopulated
        ? String(plain.companyProviderId._id)
        : String(plain.companyProviderId),

      platformId: platformPopulated
        ? String(plain.platformId._id)
        : String(plain.platformId),

      projectKey: String(plain.projectKey ?? ''),

      version: String(plain.version ?? ''),
      fileName: String(plain.fileName ?? ''),
      originalFileName: String(plain.originalFileName ?? ''),
      extension: String(plain.extension ?? ''),
      fileKey: String(plain.fileKey ?? ''),

      size: Number(plain.size ?? 0),
      contentType: String(plain.contentType ?? 'application/octet-stream'),

      comments: String(plain.comments ?? ''),

      isCurrentVersion: !!plain.isCurrentVersion,
      isActive: !!plain.isActive,

      projectCodePlatform: projectCodePlatformPopulated
        ? {
            id: String(plain.projectCodePlatformId._id),
            deliveryMode: String(
              plain.projectCodePlatformId.deliveryMode ?? '',
            ),
            runtimeMode: String(plain.projectCodePlatformId.runtimeMode ?? ''),
            status: String(plain.projectCodePlatformId.status ?? ''),
            isActive: !!plain.projectCodePlatformId.isActive,
          }
        : undefined,

      codeProject: codeProjectPopulated
        ? {
            id: String(plain.codeProjectId._id),
            projectKey: String(plain.codeProjectId.projectKey ?? ''),
            name: String(plain.codeProjectId.name ?? ''),
            status: String(plain.codeProjectId.status ?? ''),
            isActive: !!plain.codeProjectId.isActive,
          }
        : undefined,

      companyProvider: companyProviderPopulated
        ? {
            id: String(plain.companyProviderId._id),
            companyName: String(plain.companyProviderId.companyName ?? ''),
          }
        : undefined,

      platform: platformPopulated
        ? {
            id: String(plain.platformId._id),
            name: String(plain.platformId.name ?? ''),
            category: String(plain.platformId.category ?? ''),
            connectionType: String(plain.platformId.connectionType ?? ''),
            imageUrl: String(plain.platformId.imageUrl ?? ''),
            isActive: !!plain.platformId.isActive,
            isSupported: !!plain.platformId.isSupported,
          }
        : undefined,

      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  static toResponseList(list: any[]): CodeProjectVersionResponseDto[] {
    return (list ?? []).map((item) => this.toResponse(item));
  }
}
