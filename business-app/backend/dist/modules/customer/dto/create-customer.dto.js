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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCustomerDto = exports.PrimaryContactDto = exports.EmbeddedContactDto = exports.CustomerAddressDto = exports.BillingRecipientDto = exports.EmbeddedLocationDto = exports.CustomerCommPurposeDto = exports.CommPurposeChannelDto = exports.CommPurposeRecipientDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class CommPurposeRecipientDto {
    email;
    recipientType;
    phone;
}
exports.CommPurposeRecipientDto = CommPurposeRecipientDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'recipient email must be a valid address' }),
    (0, class_validator_1.MaxLength)(254),
    __metadata("design:type", String)
], CommPurposeRecipientDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['to', 'cc', 'bcc'], { message: 'recipientType must be "to", "cc" or "bcc"' }),
    __metadata("design:type", String)
], CommPurposeRecipientDto.prototype, "recipientType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], CommPurposeRecipientDto.prototype, "phone", void 0);
class CommPurposeChannelDto {
    channel;
    recipients;
}
exports.CommPurposeChannelDto = CommPurposeChannelDto;
__decorate([
    (0, class_validator_1.IsEnum)(['email', 'sms']),
    __metadata("design:type", String)
], CommPurposeChannelDto.prototype, "channel", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CommPurposeRecipientDto),
    __metadata("design:type", Array)
], CommPurposeChannelDto.prototype, "recipients", void 0);
class CustomerCommPurposeDto {
    communicationDomainId;
    channels;
}
exports.CustomerCommPurposeDto = CustomerCommPurposeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'communicationDomainId is required' }),
    __metadata("design:type", String)
], CustomerCommPurposeDto.prototype, "communicationDomainId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CommPurposeChannelDto),
    __metadata("design:type", Array)
], CustomerCommPurposeDto.prototype, "channels", void 0);
class EmbeddedLocationDto {
    id;
    tag;
    country;
    line1;
    line2;
    city;
    postalCode;
    state;
}
exports.EmbeddedLocationDto = EmbeddedLocationDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EmbeddedLocationDto.prototype, "id", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Tag is required' }),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], EmbeddedLocationDto.prototype, "tag", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Country is required' }),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], EmbeddedLocationDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Address Line 1 is required' }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], EmbeddedLocationDto.prototype, "line1", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], EmbeddedLocationDto.prototype, "line2", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'City is required' }),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], EmbeddedLocationDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Postcode is required' }),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], EmbeddedLocationDto.prototype, "postalCode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], EmbeddedLocationDto.prototype, "state", void 0);
class BillingRecipientDto {
    documentType;
    email;
    recipientType;
}
exports.BillingRecipientDto = BillingRecipientDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ['invoice', 'quote', 'budget', 'purchase_order', 'statement', 'receipt', 'contract', 'general', 'other'],
        default: 'invoice',
        example: 'invoice',
        description: 'The type of business document this recipient should receive.',
    }),
    (0, class_validator_1.IsEnum)(['invoice', 'quote', 'budget', 'purchase_order', 'statement', 'receipt', 'contract', 'general', 'other'], { message: 'documentType must be a valid document type' }),
    __metadata("design:type", String)
], BillingRecipientDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'accounts@company.com', maxLength: 254 }),
    (0, class_validator_1.IsEmail)({}, { message: 'billing recipient email must be a valid email address' }),
    (0, class_validator_1.MaxLength)(254),
    __metadata("design:type", String)
], BillingRecipientDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ['to', 'cc', 'bcc'],
        example: 'to',
        description: 'Delivery role for the recipient (To, CC, or BCC).',
    }),
    (0, class_validator_1.IsEnum)(['to', 'cc', 'bcc'], { message: 'recipientType must be "to", "cc" or "bcc"' }),
    __metadata("design:type", String)
], BillingRecipientDto.prototype, "recipientType", void 0);
class CustomerAddressDto {
    country;
    state;
    city;
    postalCode;
    line1;
    line2;
}
exports.CustomerAddressDto = CustomerAddressDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Country is required' }),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "country", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "state", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'City is required' }),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "city", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "postalCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Address Line 1 is required' }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "line1", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CustomerAddressDto.prototype, "line2", void 0);
class EmbeddedContactDto {
    firstName;
    lastName;
    email;
    phone;
    role;
    isPrimary;
    locationIndex;
}
exports.EmbeddedContactDto = EmbeddedContactDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Contact name is required' }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], EmbeddedContactDto.prototype, "firstName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], EmbeddedContactDto.prototype, "lastName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'contact email must be a valid email address' }),
    (0, class_validator_1.MaxLength)(254),
    __metadata("design:type", String)
], EmbeddedContactDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], EmbeddedContactDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], EmbeddedContactDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], EmbeddedContactDto.prototype, "isPrimary", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], EmbeddedContactDto.prototype, "locationIndex", void 0);
class PrimaryContactDto {
    name;
    email;
    phone;
}
exports.PrimaryContactDto = PrimaryContactDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1, { message: 'Contact name is required' }),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], PrimaryContactDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'contact email must be a valid email address' }),
    (0, class_validator_1.MaxLength)(254),
    __metadata("design:type", String)
], PrimaryContactDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], PrimaryContactDto.prototype, "phone", void 0);
class CreateCustomerDto {
    type;
    displayName;
    abn;
    contact;
    address;
    notes;
    contacts;
    locations;
    communicationPurposes;
    billingRecipients;
}
exports.CreateCustomerDto = CreateCustomerDto;
__decorate([
    (0, class_validator_1.IsEnum)(['company', 'individual']),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "displayName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{11}$/, { message: 'abn must be exactly 11 digits' }),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "abn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PrimaryContactDto),
    __metadata("design:type", PrimaryContactDto)
], CreateCustomerDto.prototype, "contact", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CustomerAddressDto),
    __metadata("design:type", CustomerAddressDto)
], CreateCustomerDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateCustomerDto.prototype, "notes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(50),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EmbeddedContactDto),
    __metadata("design:type", Array)
], CreateCustomerDto.prototype, "contacts", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => EmbeddedLocationDto),
    __metadata("design:type", Array)
], CreateCustomerDto.prototype, "locations", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CustomerCommPurposeDto),
    __metadata("design:type", Array)
], CreateCustomerDto.prototype, "communicationPurposes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => BillingRecipientDto),
    __metadata("design:type", Array)
], CreateCustomerDto.prototype, "billingRecipients", void 0);
//# sourceMappingURL=create-customer.dto.js.map