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
exports.CustomerSchema = exports.Customer = exports.PrimaryContactSchema = exports.PrimaryContact = exports.CustomerAddressSchema = exports.CustomerAddress = exports.ContactSchema = exports.Contact = exports.CustomerLocationSchema = exports.CustomerLocation = exports.CustomerCommPurposeSchema = exports.CustomerCommPurpose = exports.CommPurposeChannelSchema = exports.CommPurposeChannel = exports.CommPurposeRecipientSchema = exports.CommPurposeRecipient = exports.BillingRecipientSchema = exports.BillingRecipient = exports.DOCUMENT_TYPES = void 0;
const mongoose_1 = require("@nestjs/mongoose");
exports.DOCUMENT_TYPES = [
    'invoice', 'quote', 'budget', 'purchase_order',
    'statement', 'receipt', 'contract', 'general', 'other',
];
let BillingRecipient = class BillingRecipient {
    documentType;
    email;
    recipientType;
};
exports.BillingRecipient = BillingRecipient;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, enum: exports.DOCUMENT_TYPES, default: 'invoice' }),
    __metadata("design:type", String)
], BillingRecipient.prototype, "documentType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, lowercase: true }),
    __metadata("design:type", String)
], BillingRecipient.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['to', 'cc', 'bcc'] }),
    __metadata("design:type", String)
], BillingRecipient.prototype, "recipientType", void 0);
exports.BillingRecipient = BillingRecipient = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], BillingRecipient);
exports.BillingRecipientSchema = mongoose_1.SchemaFactory.createForClass(BillingRecipient);
let CommPurposeRecipient = class CommPurposeRecipient {
    email;
    recipientType;
    phone;
};
exports.CommPurposeRecipient = CommPurposeRecipient;
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: undefined, lowercase: true, trim: true }),
    __metadata("design:type", String)
], CommPurposeRecipient.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['to', 'cc', 'bcc'], default: undefined }),
    __metadata("design:type", String)
], CommPurposeRecipient.prototype, "recipientType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: undefined, trim: true }),
    __metadata("design:type", String)
], CommPurposeRecipient.prototype, "phone", void 0);
exports.CommPurposeRecipient = CommPurposeRecipient = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], CommPurposeRecipient);
exports.CommPurposeRecipientSchema = mongoose_1.SchemaFactory.createForClass(CommPurposeRecipient);
let CommPurposeChannel = class CommPurposeChannel {
    channel;
    recipients;
};
exports.CommPurposeChannel = CommPurposeChannel;
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['email', 'sms'] }),
    __metadata("design:type", String)
], CommPurposeChannel.prototype, "channel", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.CommPurposeRecipientSchema], default: [] }),
    __metadata("design:type", Array)
], CommPurposeChannel.prototype, "recipients", void 0);
exports.CommPurposeChannel = CommPurposeChannel = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], CommPurposeChannel);
exports.CommPurposeChannelSchema = mongoose_1.SchemaFactory.createForClass(CommPurposeChannel);
let CustomerCommPurpose = class CustomerCommPurpose {
    communicationDomainId;
    channels;
};
exports.CustomerCommPurpose = CustomerCommPurpose;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], CustomerCommPurpose.prototype, "communicationDomainId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.CommPurposeChannelSchema], default: [] }),
    __metadata("design:type", Array)
], CustomerCommPurpose.prototype, "channels", void 0);
exports.CustomerCommPurpose = CustomerCommPurpose = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], CustomerCommPurpose);
exports.CustomerCommPurposeSchema = mongoose_1.SchemaFactory.createForClass(CustomerCommPurpose);
let CustomerLocation = class CustomerLocation {
    _id;
    tag;
    country;
    line1;
    line2;
    city;
    postalCode;
    state;
};
exports.CustomerLocation = CustomerLocation;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], CustomerLocation.prototype, "tag", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], CustomerLocation.prototype, "country", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], CustomerLocation.prototype, "line1", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], CustomerLocation.prototype, "line2", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], CustomerLocation.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], CustomerLocation.prototype, "postalCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], CustomerLocation.prototype, "state", void 0);
exports.CustomerLocation = CustomerLocation = __decorate([
    (0, mongoose_1.Schema)({ _id: true, versionKey: false })
], CustomerLocation);
exports.CustomerLocationSchema = mongoose_1.SchemaFactory.createForClass(CustomerLocation);
let Contact = class Contact {
    _id;
    firstName;
    lastName;
    email;
    phone;
    role;
    locationId;
    isPrimary;
};
exports.Contact = Contact;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Contact.prototype, "firstName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: '', trim: true }),
    __metadata("design:type", String)
], Contact.prototype, "lastName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true, lowercase: true }),
    __metadata("design:type", Object)
], Contact.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Contact.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Contact.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Contact.prototype, "locationId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], Contact.prototype, "isPrimary", void 0);
exports.Contact = Contact = __decorate([
    (0, mongoose_1.Schema)({ _id: true, versionKey: false })
], Contact);
exports.ContactSchema = mongoose_1.SchemaFactory.createForClass(Contact);
let CustomerAddress = class CustomerAddress {
    country;
    state;
    city;
    postalCode;
    line1;
    line2;
};
exports.CustomerAddress = CustomerAddress;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], CustomerAddress.prototype, "country", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], CustomerAddress.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], CustomerAddress.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], CustomerAddress.prototype, "postalCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], CustomerAddress.prototype, "line1", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], CustomerAddress.prototype, "line2", void 0);
exports.CustomerAddress = CustomerAddress = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], CustomerAddress);
exports.CustomerAddressSchema = mongoose_1.SchemaFactory.createForClass(CustomerAddress);
let PrimaryContact = class PrimaryContact {
    name;
    email;
    phone;
};
exports.PrimaryContact = PrimaryContact;
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], PrimaryContact.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true, lowercase: true }),
    __metadata("design:type", Object)
], PrimaryContact.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], PrimaryContact.prototype, "phone", void 0);
exports.PrimaryContact = PrimaryContact = __decorate([
    (0, mongoose_1.Schema)({ _id: false, versionKey: false })
], PrimaryContact);
exports.PrimaryContactSchema = mongoose_1.SchemaFactory.createForClass(PrimaryContact);
let Customer = class Customer {
    companyId;
    type;
    displayName;
    abn;
    contact;
    email;
    phone;
    address;
    notes;
    isActive;
    contacts;
    locations;
    communicationPurposes;
    billingRecipients;
};
exports.Customer = Customer;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Customer.prototype, "companyId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['company', 'individual'] }),
    __metadata("design:type", String)
], Customer.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Customer.prototype, "displayName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Customer.prototype, "abn", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.PrimaryContactSchema, default: null }),
    __metadata("design:type", Object)
], Customer.prototype, "contact", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true, lowercase: true }),
    __metadata("design:type", Object)
], Customer.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Customer.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.CustomerAddressSchema, default: null }),
    __metadata("design:type", Object)
], Customer.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, trim: true }),
    __metadata("design:type", Object)
], Customer.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true, index: true }),
    __metadata("design:type", Boolean)
], Customer.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.ContactSchema], default: [] }),
    __metadata("design:type", Array)
], Customer.prototype, "contacts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.CustomerLocationSchema], default: [] }),
    __metadata("design:type", Array)
], Customer.prototype, "locations", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.CustomerCommPurposeSchema], default: [] }),
    __metadata("design:type", Array)
], Customer.prototype, "communicationPurposes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.BillingRecipientSchema], default: [] }),
    __metadata("design:type", Array)
], Customer.prototype, "billingRecipients", void 0);
exports.Customer = Customer = __decorate([
    (0, mongoose_1.Schema)({
        collection: 'customers',
        timestamps: true,
        versionKey: false,
    })
], Customer);
exports.CustomerSchema = mongoose_1.SchemaFactory.createForClass(Customer);
exports.CustomerSchema.index({ companyId: 1, displayName: 1 });
exports.CustomerSchema.index({ companyId: 1, isActive: 1 });
exports.CustomerSchema.index({ companyId: 1, email: 1 });
//# sourceMappingURL=customer.schema.js.map