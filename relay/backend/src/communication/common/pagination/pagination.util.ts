// src/communication/common/pagination/pagination.util.ts

import { BadRequestException } from '@nestjs/common';

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Parses and validates raw query-string limit/offset values.
 * Returns { limit, offset } or throws 400 if values are invalid.
 */
export function parsePagination(
  rawLimit?: string,
  rawOffset?: string,
): PaginationParams {
  const limit = rawLimit !== undefined ? parseInt(rawLimit, 10) : DEFAULT_LIMIT;
  const offset = rawOffset !== undefined ? parseInt(rawOffset, 10) : 0;

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new BadRequestException(
      `limit must be an integer between 1 and ${MAX_LIMIT}`,
    );
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new BadRequestException('offset must be a non-negative integer');
  }

  return { limit, offset };
}
