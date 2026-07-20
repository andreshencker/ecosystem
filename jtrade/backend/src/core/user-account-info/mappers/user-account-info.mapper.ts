import { UserAccountInfoResponseDto } from '../dto/user-account-info-response.dto';

export class UserAccountInfoMapper {
  static toResponse(doc: any): UserAccountInfoResponseDto {
    return {
      id: String(doc._id ?? doc.id),

      userProjectPlatformId: String(doc.userProjectPlatformId),
      indicatorProjectId: String(doc.indicatorProjectId),

      accountRef: doc.accountRef ?? null,
      accountLabel: doc.accountLabel ?? null,

      canTrade: !!doc.canTrade,

      useDrawdownLimit: !!doc.useDrawdownLimit,
      useProfitLimit: !!doc.useProfitLimit,
      maxDrawdownPercent: Number(doc.maxDrawdownPercent ?? 0),
      maxProfitPercent: Number(doc.maxProfitPercent ?? 0),

      isActive: doc.isActive !== false,

      userProjectPlatform: doc.userProjectPlatform,
      indicatorProject: doc.indicatorProject,

      createdAt: doc.createdAt
          ? new Date(doc.createdAt).toISOString()
          : undefined,

      updatedAt: doc.updatedAt
          ? new Date(doc.updatedAt).toISOString()
          : undefined,
    };
  }

  static toResponseList(docs: any[]): UserAccountInfoResponseDto[] {
    return (docs ?? []).map((doc) => this.toResponse(doc));
  }
}