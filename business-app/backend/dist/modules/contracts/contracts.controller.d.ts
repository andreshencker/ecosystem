import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import type { AuthContext } from '../../infrastructure/security/types/auth-context.types';
export declare class ContractsController {
    private readonly contracts;
    constructor(contracts: ContractsService);
    private resolveContext;
    findAll(ctx: AuthContext, page?: string, limit?: string, customerId?: string, status?: string, search?: string): Promise<{
        items: import("./dto/contract-response.dto").ContractResponseDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(ctx: AuthContext, id: string): Promise<import("./dto/contract-response.dto").ContractResponseDto>;
    create(ctx: AuthContext, dto: CreateContractDto): Promise<import("./dto/contract-response.dto").ContractResponseDto>;
    update(ctx: AuthContext, id: string, dto: UpdateContractDto): Promise<import("./dto/contract-response.dto").ContractResponseDto>;
    activate(ctx: AuthContext, id: string): Promise<import("./dto/contract-response.dto").ContractResponseDto>;
    cancel(ctx: AuthContext, id: string): Promise<import("./dto/contract-response.dto").ContractResponseDto>;
    finish(ctx: AuthContext, id: string): Promise<import("./dto/contract-response.dto").ContractResponseDto>;
    remove(ctx: AuthContext, id: string): Promise<{
        deleted: boolean;
    }>;
}
