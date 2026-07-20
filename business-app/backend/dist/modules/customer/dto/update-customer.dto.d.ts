import { CustomerAddressDto, BillingRecipientDto, CustomerCommPurposeDto, EmbeddedContactDto, EmbeddedLocationDto } from './create-customer.dto';
export declare class UpdatePrimaryContactDto {
    name?: string;
    email?: string;
    phone?: string;
}
export declare class UpdateCustomerDto {
    displayName?: string;
    abn?: string;
    contact?: UpdatePrimaryContactDto;
    address?: CustomerAddressDto;
    notes?: string;
    contacts?: EmbeddedContactDto[];
    locations?: EmbeddedLocationDto[];
    communicationPurposes?: CustomerCommPurposeDto[];
    billingRecipients?: BillingRecipientDto[];
}
