import { BadRequestException } from '@nestjs/common';

type BuildDateRangeFilterInput = {
  lastHours?: string | number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  maxHours?: number;
};

type MongoDateRangeFilter = {
  $gte?: Date;
  $lte?: Date;
};

export function buildDateRangeFilter({
                                       lastHours,
                                       dateFrom,
                                       dateTo,
                                       maxHours = 24 * 30, // 30 days
                                     }: BuildDateRangeFilterInput): MongoDateRangeFilter | undefined {
  const hasLastHours =
    lastHours !== undefined &&
    lastHours !== null &&
    String(lastHours).trim() !== '';

  if (hasLastHours) {
    const hours = Number(lastHours);

    if (!Number.isFinite(hours) || hours <= 0) {
      throw new BadRequestException(
        'lastHours must be a positive number',
      );
    }

    if (hours > maxHours) {
      throw new BadRequestException(
        `lastHours cannot be greater than ${maxHours}`,
      );
    }

    return {
      $gte: new Date(Date.now() - hours * 60 * 60 * 1000),
    };
  }

  const hasDateFrom =
    dateFrom !== undefined &&
    dateFrom !== null &&
    String(dateFrom).trim() !== '';

  const hasDateTo =
    dateTo !== undefined &&
    dateTo !== null &&
    String(dateTo).trim() !== '';

  if (!hasDateFrom && !hasDateTo) {
    return undefined;
  }

  const filter: MongoDateRangeFilter = {};

  if (hasDateFrom) {
    const from = new Date(String(dateFrom));

    if (Number.isNaN(from.getTime())) {
      throw new BadRequestException('dateFrom is invalid');
    }

    filter.$gte = from;
  }

  if (hasDateTo) {
    const to = new Date(String(dateTo));

    if (Number.isNaN(to.getTime())) {
      throw new BadRequestException('dateTo is invalid');
    }

    to.setHours(23, 59, 59, 999);
    filter.$lte = to;
  }

  if (filter.$gte && filter.$lte && filter.$gte > filter.$lte) {
    throw new BadRequestException(
      'dateFrom cannot be greater than dateTo',
    );
  }

  return filter;
}