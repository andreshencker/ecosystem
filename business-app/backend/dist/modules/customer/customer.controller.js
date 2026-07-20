"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const customer_service_1 = require("./customer.service");
const create_customer_dto_1 = require("./dto/create-customer.dto");
const update_customer_dto_1 = require("./dto/update-customer.dto");
const contact_dto_1 = require("./dto/contact.dto");
const customer_response_dto_1 = require("./dto/customer-response.dto");
const current_user_decorator_1 = require("../../infrastructure/security/decorators/current-user.decorator");
let CustomerController = class CustomerController {
    customers;
    constructor(customers) {
        this.customers = customers;
    }
    resolveCompanyId(ctx) {
        if (!ctx.companyId)
            throw new common_1.ForbiddenException('No company assigned to this account');
        return ctx.companyId;
    }
    async create(ctx, dto) {
        const companyId = this.resolveCompanyId(ctx);
        const doc = await this.customers.create(companyId, dto);
        return (0, customer_response_dto_1.toCustomerResponse)(doc);
    }
    async findAll(ctx, page = '1', limit = '25', search, active) {
        const companyId = this.resolveCompanyId(ctx);
        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
        const parsedActive = active === undefined ? undefined : active === 'true';
        const result = await this.customers.findAll(companyId, {
            page: parsedPage,
            limit: parsedLimit,
            search,
            active: parsedActive,
        });
        return {
            items: result.items.map(customer_response_dto_1.toCustomerResponse),
            total: result.total,
            page: result.page,
            limit: result.limit,
        };
    }
    async findOne(ctx, id) {
        const companyId = this.resolveCompanyId(ctx);
        const doc = await this.customers.findByIdOrThrow(id, companyId);
        return (0, customer_response_dto_1.toCustomerResponse)(doc);
    }
    async update(ctx, id, dto) {
        const companyId = this.resolveCompanyId(ctx);
        const doc = await this.customers.update(id, companyId, dto);
        return (0, customer_response_dto_1.toCustomerResponse)(doc);
    }
    async deactivate(ctx, id) {
        const companyId = this.resolveCompanyId(ctx);
        const doc = await this.customers.deactivate(id, companyId);
        return (0, customer_response_dto_1.toCustomerResponse)(doc);
    }
    async activate(ctx, id) {
        const companyId = this.resolveCompanyId(ctx);
        const doc = await this.customers.activate(id, companyId);
        return (0, customer_response_dto_1.toCustomerResponse)(doc);
    }
    async deleteCustomer(ctx, id) {
        const companyId = this.resolveCompanyId(ctx);
        await this.customers.delete(id, companyId);
    }
    async getContacts(ctx, id) {
        const companyId = this.resolveCompanyId(ctx);
        const contacts = await this.customers.getContacts(id, companyId);
        return {
            items: contacts.map((c) => ({
                id: String(c._id),
                firstName: c.firstName,
                lastName: c.lastName,
                email: c.email,
                phone: c.phone,
                role: c.role,
            })),
        };
    }
    async addContact(ctx, id, dto) {
        const companyId = this.resolveCompanyId(ctx);
        const contact = await this.customers.addContact(id, companyId, dto);
        return {
            id: String(contact._id),
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            role: contact.role,
        };
    }
    async updateContact(ctx, id, contactId, dto) {
        const companyId = this.resolveCompanyId(ctx);
        const contact = await this.customers.updateContact(id, companyId, contactId, dto);
        return {
            id: String(contact._id),
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            role: contact.role,
        };
    }
    async removeContact(ctx, id, contactId) {
        const companyId = this.resolveCompanyId(ctx);
        await this.customers.removeContact(id, companyId, contactId);
        return { deleted: true };
    }
};
exports.CustomerController = CustomerController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_customer_dto_1.CreateCustomerDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List customers for the authenticated company' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'active', required: false, type: Boolean }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('active')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer by ID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Update customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_customer_dto_1.UpdateCustomerDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/deactivate'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Deactivate a customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Reactivate a deactivated customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "activate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Permanently delete a customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "deleteCustomer", null);
__decorate([
    (0, common_1.Get)(':id/contacts'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'List contacts for a customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "getContacts", null);
__decorate([
    (0, common_1.Post)(':id/contacts'),
    (0, common_1.HttpCode)(201),
    (0, swagger_1.ApiOperation)({ summary: 'Add a contact to a customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, contact_dto_1.CreateContactDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "addContact", null);
__decorate([
    (0, common_1.Patch)(':id/contacts/:contactId'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Update a contact' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('contactId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, contact_dto_1.UpdateContactDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "updateContact", null);
__decorate([
    (0, common_1.Delete)(':id/contacts/:contactId'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a contact from a customer' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('contactId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "removeContact", null);
exports.CustomerController = CustomerController = __decorate([
    (0, swagger_1.ApiTags)('Customers'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('customers'),
    __metadata("design:paramtypes", [customer_service_1.CustomerService])
], CustomerController);
//# sourceMappingURL=customer.controller.js.map