import { ExecutionLogResponseDto } from '../dto/execution-log-response.dto';

export class ExecutionLogMapper {
  static toResponse(doc: any): ExecutionLogResponseDto {
    return {
      id: String(doc._id),
      companyId: String(doc.companyId),
      domainKey: doc.domainKey,
      eventKey: doc.eventKey,
      canonicalEventKey: doc.canonicalEventKey,
      channel: doc.channel,
      layoutTemplateId: doc.layoutTemplateId
        ? String(doc.layoutTemplateId)
        : null,
      themeId: doc.themeId ? String(doc.themeId) : null,
      providerId: doc.providerId ? String(doc.providerId) : null,
      providerCredentialsId: doc.providerCredentialsId
        ? String(doc.providerCredentialsId)
        : null,
      renderStatus: doc.renderStatus,
      deliveryStatus: doc.deliveryStatus,
      renderedAt: doc.renderedAt
        ? new Date(doc.renderedAt).toISOString()
        : null,
      sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
      providerMessageId: doc.providerMessageId ?? null,
      errorMessage: doc.errorMessage ?? null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  static toResponseList(docs: any[]): ExecutionLogResponseDto[] {
    return (docs ?? []).map((d) => this.toResponse(d));
  }
}
