export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
export declare function createPagedResult<T>(items: T[], total: number, page: number, pageSize: number): PagedResult<T>;
