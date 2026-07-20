import { SignalResponseDto } from '../dto/signal-response.dto';

export class SignalMapper {
  static toResponse(signal: any): SignalResponseDto {
    const plain =
      typeof signal?.toObject === 'function' ? signal.toObject() : signal;

    return {
      id: String(plain._id ?? plain.id),
      adminIndicatorId: String(plain.adminIndicatorId),
      action: plain.action,
      symbol: plain.symbol,
      createdAt: plain.createdAt,
    };
  }

  static toResponseList(signals: any[]): SignalResponseDto[] {
    return (signals ?? []).map((s) => this.toResponse(s));
  }
}
