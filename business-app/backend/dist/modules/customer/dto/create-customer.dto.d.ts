export declare class CommPurposeRecipientDto {
    email?: string;
    recipientType?: 'to' | 'cc' | 'bcc';
    phone?: string;
}
export declare class CommPurposeChannelDto {
    channel: 'email' | 'sms';
    recipients?: CommPurposeRecipientDto[];
}
export declare class CustomerCommPurposeDto {
    communicationDomainId: string;
    channels?: CommPurposeChannelDto[];
}
export declare class EmbeddedLocationDto {
    id?: string;
    tag: string;
    country: string;
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    state?: string;
}
export declare class BillingRecipientDto {
    documentType: string;
    email: string;
    recipientType: 'to' | 'cc' | 'bcc';
}
export declare class CustomerAddressDto {
    country: string;
    state?: string;
    city: string;
    postalCode?: string;
    line1: string;
    line2?: string;
}
export declare class EmbeddedContactDto {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
    locationIndex?: number;
}
export declare class PrimaryContactDto {
    name: string;
    email?: string;
    phone?: string;
}
export declare class CreateCustomerDto {
    type: 'company' | 'individual';
    displayName: string;
    abn?: string;
    contact?: PrimaryContactDto;
    address?: CustomerAddressDto;
    notes?: string;
    contacts?: EmbeddedContactDto[];
    locations?: EmbeddedLocationDto[];
    communicationPurposes?: CustomerCommPurposeDto[];
    billingRecipients?: BillingRecipientDto[];
}
