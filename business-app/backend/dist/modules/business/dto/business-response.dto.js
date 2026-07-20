"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessResponseDto = void 0;
class BusinessResponseDto {
    id;
    businessKey;
    businessName;
    ownerUserId;
    abn;
    depositAccount;
    defaultCurrency;
    isActive;
    isPlatformCompany;
    createdAt;
    updatedAt;
    static from(doc) {
        const dto = new BusinessResponseDto();
        dto.id = String(doc._id ?? doc.id);
        dto.businessKey = doc.businessKey ?? '';
        dto.businessName = doc.businessName ?? '';
        dto.ownerUserId = doc.ownerUserId ?? null;
        dto.abn = doc.abn ?? null;
        dto.depositAccount = doc.depositAccount ?? { bsb: null, accountNumber: null };
        dto.defaultCurrency = doc.defaultCurrency ?? 'AUD';
        dto.isActive = doc.isActive ?? true;
        dto.isPlatformCompany = doc.isPlatformCompany ?? false;
        dto.createdAt = doc.createdAt instanceof Date
            ? doc.createdAt.toISOString()
            : String(doc.createdAt ?? '');
        dto.updatedAt = doc.updatedAt instanceof Date
            ? doc.updatedAt.toISOString()
            : String(doc.updatedAt ?? '');
        return dto;
    }
}
exports.BusinessResponseDto = BusinessResponseDto;
//# sourceMappingURL=business-response.dto.js.map