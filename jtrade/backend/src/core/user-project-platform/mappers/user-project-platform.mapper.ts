import { UserProjectPlatformResponseDto } from '../dto/user-project-platform-response.dto';

export class UserProjectPlatformMapper {
  private static buildFullName(user: any): string | undefined {
    if (!user) return undefined;

    const fullName = [
      user.firstName,
      user.middleName,
      user.lastName,
      user.secondLastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || undefined;
  }

  static toResponse(doc: any): UserProjectPlatformResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    const user =
      plain?.userId && typeof plain.userId === 'object'
        ? plain.userId
        : plain?.user;

    const projectCodePlatform =
      plain?.projectCodePlatformId &&
      typeof plain.projectCodePlatformId === 'object'
        ? plain.projectCodePlatformId
        : plain?.projectCodePlatform;

    const codeProject =
      projectCodePlatform?.codeProjectId &&
      typeof projectCodePlatform.codeProjectId === 'object'
        ? projectCodePlatform.codeProjectId
        : projectCodePlatform?.codeProject;

    const platform =
      projectCodePlatform?.platformId &&
      typeof projectCodePlatform.platformId === 'object'
        ? projectCodePlatform.platformId
        : projectCodePlatform?.platform;

    const companyProvider =
      codeProject?.companyProviderId &&
      typeof codeProject.companyProviderId === 'object'
        ? codeProject.companyProviderId
        : codeProject?.companyProvider;

    const typeProject =
      codeProject?.typeProjectId &&
      typeof codeProject.typeProjectId === 'object'
        ? codeProject.typeProjectId
        : codeProject?.typeProject;

    return {
      id: String(plain._id ?? plain.id),

      userId: user?._id ? String(user._id) : String(plain.userId ?? ''),

      projectCodePlatformId: projectCodePlatform?._id
        ? String(projectCodePlatform._id)
        : String(plain.projectCodePlatformId ?? ''),

      isActive: plain.isActive !== false,

      subscribedAt: plain.subscribedAt,
      lastDownloadAt: plain.lastDownloadAt ?? null,

      user: user
        ? {
            id: String(user._id ?? user.id),
            fullName: this.buildFullName(user),
            email: String(user.email ?? ''),
            role: String(user.role ?? ''),
            avatarUrl: user.avatarUrl,
          }
        : undefined,

      projectCodePlatform: projectCodePlatform
        ? {
            id: String(projectCodePlatform._id ?? projectCodePlatform.id),
            deliveryMode: projectCodePlatform.deliveryMode,
            runtimeMode: projectCodePlatform.runtimeMode,
            status: projectCodePlatform.status,
            isActive: projectCodePlatform.isActive !== false,

            codeProject: codeProject
              ? {
                  id: String(codeProject._id ?? codeProject.id),
                  projectKey: String(codeProject.projectKey ?? ''),
                  name: String(codeProject.name ?? ''),
                  description: codeProject.description ?? '',
                  isActive: codeProject.isActive !== false,

                  typeProject: typeProject
                    ? {
                        id: String(typeProject._id ?? typeProject.id),
                        key: String(typeProject.key ?? ''),
                        name: String(typeProject.name ?? ''),
                        isActive: typeProject.isActive !== false,
                      }
                    : undefined,
                }
              : undefined,

            platform: platform
              ? {
                  id: String(platform._id ?? platform.id),
                  name: String(platform.name ?? ''),
                  category: platform.category,
                  connectionType: platform.connectionType,
                  imageUrl: platform.imageUrl,
                  isActive: platform.isActive !== false,
                  isSupported: platform.isSupported === true,
                }
              : undefined,

            companyProvider: companyProvider
              ? {
                  id: String(companyProvider._id ?? companyProvider.id),
                  companyName: String(companyProvider.companyName ?? ''),
                  legalName: companyProvider.legalName,
                  logoUrl: companyProvider.logoUrl,
                  isActive: companyProvider.isActive !== false,
                }
              : undefined,
          }
        : undefined,

      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  static toResponseList(list: any[]): UserProjectPlatformResponseDto[] {
    return (list ?? []).map((item) => this.toResponse(item));
  }
}
