import { Model } from 'mongoose';
import { CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
export interface CustomerListParams {
    page: number;
    limit: number;
    search?: string;
    active?: boolean;
}
export declare class CustomerService {
    private readonly model;
    private readonly outbox;
    constructor(model: Model<CustomerDocument>, outbox: OutboxService);
    private buildLocations;
    private buildCommPurposes;
    private assertBillingRecipients;
    create(companyId: string, dto: CreateCustomerDto): Promise<CustomerDocument>;
    findAll(companyId: string, params: CustomerListParams): Promise<{
        items: CustomerDocument[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string, companyId: string): Promise<CustomerDocument | null>;
    findByIdOrThrow(id: string, companyId: string): Promise<CustomerDocument>;
    update(id: string, companyId: string, dto: UpdateCustomerDto): Promise<CustomerDocument>;
    deactivate(id: string, companyId: string): Promise<CustomerDocument>;
    activate(id: string, companyId: string): Promise<CustomerDocument>;
    delete(id: string, companyId: string): Promise<void>;
    getContacts(customerId: string, companyId: string): Promise<any[]>;
    addContact(customerId: string, companyId: string, dto: CreateContactDto): Promise<any>;
    updateContact(customerId: string, companyId: string, contactId: string, dto: UpdateContactDto): Promise<any>;
    removeContact(customerId: string, companyId: string, contactId: string): Promise<void>;
}
