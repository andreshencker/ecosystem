"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentOrg = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentOrg = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.authContext?.organizationId;
});
//# sourceMappingURL=current-org.decorator.js.map