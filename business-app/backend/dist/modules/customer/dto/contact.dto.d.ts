export declare class CreateContactDto {
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
    locationId?: string | null;
}
export declare class UpdateContactDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
    locationId?: string | null;
}
