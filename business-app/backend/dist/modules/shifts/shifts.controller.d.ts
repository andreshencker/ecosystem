import { ShiftsService } from './shifts.service';
import { ShiftSyncService } from './sync/services/shift-sync.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { AssignContractDto } from './dto/assign-contract.dto';
import { BulkAssignContractDto } from './dto/bulk-assign-contract.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
export declare class ShiftsController {
    private readonly shifts;
    private readonly syncService;
    constructor(shifts: ShiftsService, syncService: ShiftSyncService);
    private resolveContext;
    triggerSync(ctx: AuthContext): Promise<import("./sync/interfaces/sync-result.interface").BusinessSyncResult>;
    triggerSyncSingle(ctx: AuthContext, linkedCalendarId: string): Promise<import("./sync/interfaces/sync-result.interface").CalendarSyncStats>;
    getSyncHistory(ctx: AuthContext, page?: string, limit?: string, linkedCalendarId?: string): Promise<{
        items: (import("mongoose").Document<unknown, {}, import("./sync/schemas/sync-history.schema").SyncHistory, {}, import("mongoose").DefaultSchemaOptions> & import("./sync/schemas/sync-history.schema").SyncHistory & {
            _id: import("mongoose").Types.ObjectId;
        } & {
            __v: number;
        } & {
            id: string;
        } & Required<{
            _id: import("mongoose").Types.ObjectId;
        }>)[];
        total: number;
        page: number;
        limit: number;
    }>;
    findAll(ctx: AuthContext, page?: string, limit?: string, contractId?: string, customerId?: string, status?: string, date?: string, search?: string, source?: string, linkedCalendarId?: string): Promise<{
        items: import("./dto/shift-response.dto").ShiftResponseDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(ctx: AuthContext, id: string): Promise<import("./dto/shift-response.dto").ShiftResponseDto>;
    create(ctx: AuthContext, dto: CreateShiftDto): Promise<import("./dto/shift-response.dto").ShiftResponseDto>;
    bulkAssignContracts(ctx: AuthContext, dto: BulkAssignContractDto): Promise<{
        success: true;
        total: number;
        updated: number;
        skipped: number;
        shiftIds: string[];
    }>;
    update(ctx: AuthContext, id: string, dto: UpdateShiftDto): Promise<import("./dto/shift-response.dto").ShiftResponseDto>;
    confirm(ctx: AuthContext, id: string): Promise<import("./dto/shift-response.dto").ShiftResponseDto>;
    assignContract(ctx: AuthContext, id: string, dto: AssignContractDto): Promise<import("./dto/shift-response.dto").ShiftResponseDto>;
    cancel(ctx: AuthContext, id: string): Promise<import("./dto/shift-response.dto").ShiftResponseDto>;
    remove(ctx: AuthContext, id: string): Promise<{
        deleted: boolean;
    }>;
}
