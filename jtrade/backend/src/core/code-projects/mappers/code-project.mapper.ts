import { CodeProjectResponseDto } from '../dto/code-project-response.dto';

export class CodeProjectMapper {
  static toResponse(doc: any): CodeProjectResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;

    return {
      id: plain._id?.toString?.() ?? String(plain._id),

      companyProviderId:
        plain.companyProviderId?._id?.toString?.() ??
        plain.companyProviderId?.toString?.() ??
        String(plain.companyProviderId),

      typeProjectId:
        plain.typeProjectId?._id?.toString?.() ??
        plain.typeProjectId?.toString?.() ??
        String(plain.typeProjectId),

      projectKey: plain.projectKey,
      name: plain.name,
      description: plain.description ?? '',

      status: plain.status,
      isActive: !!plain.isActive,

      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,

      companyProvider: plain.companyProvider
        ? {
            id:
              plain.companyProvider._id?.toString?.() ??
              String(plain.companyProvider._id),
            companyName: plain.companyProvider.companyName,
          }
        : undefined,

      typeProject: plain.typeProject
        ? {
            id:
              plain.typeProject._id?.toString?.() ??
              String(plain.typeProject._id),
            key: plain.typeProject.key,
            name: plain.typeProject.name,
          }
        : undefined,
    };
  }

  static toResponseList(list: any[]): CodeProjectResponseDto[] {
    return (list ?? []).map((item) => this.toResponse(item));
  }
}
