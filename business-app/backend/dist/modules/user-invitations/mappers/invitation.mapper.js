"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationMapper = void 0;
class InvitationMapper {
    static toResponse(doc) {
        const toISO = (v) => v instanceof Date ? v.toISOString() : String(v ?? '');
        return {
            id: String(doc._id ?? doc.id),
            userId: doc.userId ?? null,
            email: doc.email,
            firstName: doc.firstName,
            lastName: doc.lastName,
            role: doc.role,
            companyId: doc.companyId ?? null,
            businessKey: doc.businessKey ?? null,
            expiresAt: toISO(doc.expiresAt),
            status: doc.status,
            invitedByUserId: doc.invitedByUserId ?? null,
            invitationScope: doc.invitationScope,
            senderCredentialScope: doc.senderCredentialScope,
            createdAt: toISO(doc.createdAt),
            updatedAt: toISO(doc.updatedAt),
        };
    }
    static toResponseList(docs) {
        return (docs ?? []).map((d) => this.toResponse(d));
    }
}
exports.InvitationMapper = InvitationMapper;
//# sourceMappingURL=invitation.mapper.js.map