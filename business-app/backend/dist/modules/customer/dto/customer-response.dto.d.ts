import type { CustomerDocument, CustomerType, BillingRecipientType, DocumentType } from '../schemas/customer.schema';
export interface CustomerLocationResponseDto {
    id: string;
    tag: string;
    country: string;
    line1: string;
    line2: string | null;
    city: string;
    postalCode: string;
    state: string | null;
}
export interface CommPurposeRecipientResponseDto {
    email?: string;
    recipientType?: 'to' | 'cc' | 'bcc';
    phone?: string;
}
export interface CommPurposeChannelResponseDto {
    channel: 'email' | 'sms';
    recipients: CommPurposeRecipientResponseDto[];
}
export interface CustomerCommPurposeResponseDto {
    communicationDomainId: string;
    channels: CommPurposeChannelResponseDto[];
}
export interface PrimaryContactResponseDto {
    name: string | null;
    email: string | null;
    phone: string | null;
}
export interface BillingRecipientResponseDto {
    documentType: DocumentType;
    email: string;
    recipientType: BillingRecipientType;
}
export interface ContactResponseDto {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    isPrimary: boolean;
    locationId: string | null;
}
export interface CustomerAddressResponseDto {
    country: string;
    state: string | null;
    city: string;
    postalCode: string | null;
    line1: string;
    line2: string | null;
}
export interface CustomerResponseDto {
    id: string;
    companyId: string;
    type: CustomerType;
    displayName: string;
    abn: string | null;
    contact: PrimaryContactResponseDto;
    address: CustomerAddressResponseDto | null;
    notes: string | null;
    isActive: boolean;
    contacts: ContactResponseDto[];
    locations: CustomerLocationResponseDto[];
    communicationPurposes: CustomerCommPurposeResponseDto[];
    billingRecipients: BillingRecipientResponseDto[];
    createdAt: string;
    updatedAt: string;
}
export declare function toCustomerResponse(doc: CustomerDocument | Record<string, any>): CustomerResponseDto;
