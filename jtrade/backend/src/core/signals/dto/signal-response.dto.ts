import { SignalAction } from '../schemas/signal.schema';

export class SignalResponseDto {
  id!: string;
  adminIndicatorId!: string;
  action!: SignalAction;
  symbol!: string;
  createdAt?: Date;
}
