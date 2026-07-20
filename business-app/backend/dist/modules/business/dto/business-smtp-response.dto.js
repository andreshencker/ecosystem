"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessSmtpResponseDto = void 0;
class BusinessSmtpResponseDto {
    companyId;
    fromEmail;
    fromName;
    hasCredentials;
    isActive;
    verifiedAt;
    static from(doc) {
        const dto = new BusinessSmtpResponseDto();
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
exports.BusinessSmtpResponseDto = BusinessSmtpResponseDto;
//# sourceMappingURL=business-smtp-response.dto.js.map