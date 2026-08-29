import { api } from "@/lib/http";
import type {
    AccountRefSubscriptionsResponse,
    CreateSymbolExecutionDto,
    SymbolExecution,
    UpdateSymbolExecutionDto,
} from "../types/symbolExecution";

function unwrap<T>(resp: any): T {
    return (resp?.data?.data ?? resp?.data) as T;
}

export async function listMySymbolExecutions(): Promise<SymbolExecution[]> {
    const resp = await api.get("/symbol-executions");
    const raw = unwrap<any[]>(resp) ?? [];
    return raw.map((x) => ({ ...x, id: x.id ?? x._id }));
}

export async function createMySymbolExecution(
    dto: CreateSymbolExecutionDto
): Promise<SymbolExecution> {
    const resp = await api.post("/symbol-executions", dto);
    const x: any = unwrap(resp);
    return { ...x, id: x.id ?? x._id };
}

export async function updateMySymbolExecution(
    id: string,
    dto: UpdateSymbolExecutionDto
): Promise<SymbolExecution> {
    const resp = await api.patch(`/symbol-executions/${id}`, dto);
    const x: any = unwrap(resp);
    return { ...x, id: x.id ?? x._id };
}

export async function deleteMySymbolExecution(
    id: string
): Promise<{ deleted: boolean }> {
    const resp = await api.delete(`/symbol-executions/${id}`);
    return unwrap(resp);
}

export async function getByAccountRef(params: {
    accountRef: string;
    symbol?: string;
    timeframe?: string;
}): Promise<AccountRefSubscriptionsResponse> {
    const resp = await api.get("/symbol-executions/by-account", { params });
    return unwrap(resp);
}