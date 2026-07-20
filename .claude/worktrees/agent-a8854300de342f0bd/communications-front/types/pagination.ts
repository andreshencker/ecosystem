// ─── Offset-based pagination (used by /companies) ────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ─── Page-based pagination (used by /users) ───────────────────────────────────

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PageParams {
  page?: number;
  limit?: number;
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

export type SortOrder = 'asc' | 'desc';

export interface SortParams {
  sortBy?: string;
  sortOrder?: SortOrder;
}

// ─── Combined ─────────────────────────────────────────────────────────────────

export interface ListParams extends PageParams, SortParams {
  search?: string;
}

// ─── Generic API wrapper (for single-item responses) ─────────────────────────

export interface ApiResponse<T> {
  data: T;
}
