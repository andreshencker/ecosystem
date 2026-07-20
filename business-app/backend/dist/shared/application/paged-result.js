"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPagedResult = createPagedResult;
function createPagedResult(items, total, page, pageSize) {
    const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
    return {
        items,
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
}
//# sourceMappingURL=paged-result.js.map