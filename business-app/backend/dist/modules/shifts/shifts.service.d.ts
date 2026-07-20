import { Model } from 'mongoose';
import { ShiftDocument } from './schemas/shift.schema';
import { ContractDocument } from '../contracts/schemas/contract.schema';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { CommunicationsClientService } from '../../integrations/communications/client/communications-client.service';
import { BusinessIntelligenceService } from '../../integrations/business-intelligence/business-intelligence.service';
import { UsersService } from '../users/users.service';
import { LinkedCalendarsService } from '../linked-calendars/linked-calendars.service';
import { CommunicationsCalendarClient } from '../linked-calendars/clients/communications-calendar.client';
export interface ShiftListParams {
    page: number;
    limit: number;
    contractId?: string;
    customerId?: string;
    status?: string;
    date?: string;
    search?: string;
    source?: string;
    linkedCalendarId?: string;
}
export interface ActorContext {
    email: string;
    firstName: string;
    companyId: string;
}
export declare class ShiftsService {
    private readonly model;
    private readonly contractModel;
    private readonly commClient;
    private readonly biService;
    private readonly usersService;
    private readonly linkedCalendarsService;
    private readonly calendarClient;
    private readonly logger;
    constructor(model: Model<ShiftDocument>, contractModel: Model<ContractDocument>, commClient: CommunicationsClientService, biService: BusinessIntelligenceService, usersService: UsersService, linkedCalendarsService: LinkedCalendarsService, calendarClient: CommunicationsCalendarClient);
    private assertContractOwnership;
    create(businessId: string, dto: CreateShiftDto, actor: ActorContext): Promise<ShiftDocument>;
    findAll(businessId: string, params: ShiftListParams): Promise<{
        items: ShiftDocument[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string, businessId: string): Promise<ShiftDocument | null>;
    findByIdOrThrow(id: string, businessId: string): Promise<ShiftDocument>;
    update(id: string, businessId: string, dto: UpdateShiftDto, actor: ActorContext): Promise<ShiftDocument>;
    static computeEndDateStr(date: string, startTime: string, endTime: string): string;
    private _pushExternalUpdate;
    confirm(id: string, businessId: string, actor: ActorContext): Promise<ShiftDocument>;
    cancel(id: string, businessId: string, actor: ActorContext): Promise<ShiftDocument>;
    assignContract(id: string, businessId: string, contractId: string, actor: ActorContext): Promise<ShiftDocument>;
    bulkAssignContracts(businessId: string, assignments: Array<{
        shiftId: string;
        contractId: string;
    }>, actor: ActorContext): Promise<{
        success: true;
        total: number;
        updated: number;
        skipped: number;
        shiftIds: string[];
    }>;
    remove(id: string, businessId: string, actor: ActorContext): Promise<void>;
    private _notify;
}
