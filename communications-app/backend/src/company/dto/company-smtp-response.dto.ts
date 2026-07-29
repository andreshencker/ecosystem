export class CompanySmtpResponseDto {
  companyId!: string;
  fromEmail!: string;
  fromName!: string;
  /** True if SMTP credentials (host, user, pass) have been configured. */
  hasCredentials!: boolean;
  isActive!: boolean;
  verifiedAt!: Date | null;

  static from(doc: any): CompanySmtpResponseDto {
    const dto = new CompanySmtpResponseDto();
    dto.companyId = doc.companyId;
    dto.fromEmail = doc.fromEmail ?? '';
    dto.fromName = doc.fromName ?? '';
    dto.hasCredentials =
      doc.credentials !== null && doc.credentials !== undefined;
    dto.isActive = doc.isActive ?? true;
    dto.verifiedAt = doc.verifiedAt ?? null;
    return dto;
  }
}
