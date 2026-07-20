import { SymbolExecutionResponseDto } from '../dto/symbol-execution-response.dto';

export class SymbolExecutionMapper {
  static toResponse(doc: any): SymbolExecutionResponseDto {
    if (!doc) return doc;

    return {
      id: String(doc._id ?? doc.id),
      userAccountInfoId: String(doc.userAccountInfoId),
      alertGroupId: String(doc.alertGroupId),

      contractSize: Number(doc.contractSize ?? 0),
      riskPercent: Number(doc.riskPercent ?? 0),

      stopDistancePips: Number(doc.stopDistancePips ?? 0),
      returnRatio: Number(doc.returnRatio ?? 0),

      useStopLoss: doc.useStopLoss !== false,
      useTakeProfit: doc.useTakeProfit !== false,

      useTrailingStop: !!doc.useTrailingStop,
      useBreakEven: doc.useBreakEven !== false,

      atrPeriod: Number(doc.atrPeriod ?? 0),
      atrMultiplier: Number(doc.atrMultiplier ?? 0),

      closeTradesOnWeekend: !!doc.closeTradesOnWeekend,

      isActive: !!doc.isActive,

      userAccountInfo: doc.userAccountInfo ?? undefined,
      alertGroup: doc.alertGroup ?? undefined,

      createdAt: doc.createdAt
          ? new Date(doc.createdAt).toISOString()
          : undefined,

      updatedAt: doc.updatedAt
          ? new Date(doc.updatedAt).toISOString()
          : undefined,
    };
  }

  static toResponseList(docs: any[]): SymbolExecutionResponseDto[] {
    return (docs ?? []).map((doc) => this.toResponse(doc));
  }
}