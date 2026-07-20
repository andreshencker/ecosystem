export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function createPagedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PagedResult<T> {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
