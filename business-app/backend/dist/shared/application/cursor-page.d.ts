export interface CursorPage<T> {
    items: T[];
    nextCursor: string | undefined;
    previousCursor: string | undefined;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    total: number | undefined;
}
