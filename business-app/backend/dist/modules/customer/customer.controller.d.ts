import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
export declare class CustomerController {
    private readonly customers;
    constructor(customers: CustomerService);
    private resolveCompanyId;
    create(ctx: AuthContext, dto: CreateCustomerDto): Promise<import("./dto/customer-response.dto").CustomerResponseDto>;
    findAll(ctx: AuthContext, page?: string, limit?: string, search?: string, active?: string): Promise<{
        items: import("./dto/customer-response.dto").CustomerResponseDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(ctx: AuthContext, id: string): Promise<import("./dto/customer-response.dto").CustomerResponseDto>;
    update(ctx: AuthContext, id: string, dto: UpdateCustomerDto): Promise<import("./dto/customer-response.dto").CustomerResponseDto>;
    deactivate(ctx: AuthContext, id: string): Promise<import("./dto/customer-response.dto").CustomerResponseDto>;
    activate(ctx: AuthContext, id: string): Promise<import("./dto/customer-response.dto").CustomerResponseDto>;
    deleteCustomer(ctx: AuthContext, id: string): Promise<void>;
    getContacts(ctx: AuthContext, id: string): Promise<{
        items: {
            id: string;
            firstName: any;
            lastName: any;
            email: any;
            phone: any;
            role: any;
        }[];
    }>;
    addContact(ctx: AuthContext, id: string, dto: CreateContactDto): Promise<{
        id: string;
        firstName: any;
        lastName: any;
        email: any;
        phone: any;
        role: any;
    }>;
    updateContact(ctx: AuthContext, id: string, contactId: string, dto: UpdateContactDto): Promise<{
        id: string;
        firstName: any;
        lastName: any;
        email: any;
        phone: any;
        role: any;
    }>;
    removeContact(ctx: AuthContext, id: string, contactId: string): Promise<{
        deleted: boolean;
    }>;
}
