import type { DeliveryStatus, ExecutionChannel, RenderStatus } from '../schemas/execution-log.schema';

export class ExecutionLogResponseDto {
  id!: string;
  companyId!: string;
  domainKey!: string;
  eventKey!: string;
  canonicalEventKey!: string;
  channel!: ExecutionChannel;

  layoutTemplateId!: string | null;
  themeId!: string | null;
  providerId!: string | null;
  providerCredentialsId!: string | null;

  renderStatus!: RenderStatus;
  deliveryStatus!: DeliveryStatus;

  renderedAt!: string | null;
  sentAt!: string | null;
  providerMessageId!: string | null;
  errorMessage!: string | null;

  createdAt!: string;
  updatedAt!: string;
}
