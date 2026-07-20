import { Model } from 'mongoose';
import { ContractDocument } from './schemas/contract.schema';
import { CustomerDocument } from '../customer/schemas/customer.schema';
import { LinkedCalendarDocument } from '../linked-calendars/schemas/linked-calendar.schema';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
import { UsersService } from '../users/users.service';
export interface ContractListParams {
    page: number;
    limit: number;
    customerId?: string;
    status?: string;
    search?: string;
}
export interface ActorContext {
    email: string;
    firstName: string;
    companyId: string;
}
export declare class ContractsService {
    private readonly model;
    private readonly customerModel;
    private readonly calendarModel;
    private readonly shiftModel;
    private readonly commClient;
    private readonly usersService;
    private readonly logger;
    constructor(model: Model<ContractDocument>, customerModel: Model<CustomerDocument>, calendarModel: Model<LinkedCalendarDocument>, shiftModel: Model<any>, commClient: CommunicationsClientService, usersService: UsersService);
    private assertCustomerOwnership;
    private assertCalendarFlow;
    private validateRates;
    private validateDateRange;
    create(businessId: string, dto: CreateContractDto, actor: ActorContext): Promise<ContractDocument>;
    findAll(businessId: string, params: ContractListParams): Promise<{
        items: ContractDocument[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string, businessId: string): Promise<ContractDocument | null>;
    findByIdOrThrow(id: string, businessId: string): Promise<ContractDocument>;
    findByCustomer(customerId: string, businessId: string): Promise<ContractDocument[]>;
    update(id: string, businessId: string, dto: UpdateContractDto, actor: ActorContext): Promise<ContractDocument>;
    activate(id: string, businessId: string, actor: ActorContext): Promise<ContractDocument>;
    cancel(id: string, businessId: string, actor: ActorContext): Promise<ContractDocument>;
    finish(id: string, businessId: string, actor: ActorContext): Promise<ContractDocument>;
    remove(id: string, businessId: string): Promise<void>;
    private _notify;
}
