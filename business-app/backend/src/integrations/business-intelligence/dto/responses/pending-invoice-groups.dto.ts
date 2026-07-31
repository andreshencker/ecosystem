/**
 * BI response types for the /internal/invoices/pending-groups endpoint.
 *
 * BI performs all calculations:
 *   - gross duration (startTime to endTime, overnight-safe)
 *   - break deduction (breakTaken + contract.defaultBreakMinutes)
 *   - rate resolution (RateRule[] matching by day / time range)
 *   - line amounts (workedHours × appliedRate, decimal arithmetic)
 *   - subtotal, tax, total
 *
 * The Business App backend proxies these values and persists them on approval.
 * The frontend never recalculates any value.
 */

export type PendingGroupStatus = 'ready' | 'warning' | 'blocked';
export type ShiftCalcStatus    = 'ok' | 'warning' | 'error';

// ─── Shift-level calculation row ──────────────────────────────────────────────

export interface PendingShiftCalculation {
  shiftId: string;
  /** YYYY-MM-DD local date in the shift's timezone. */
  workDate: string;
  description: string | null;
  /** HH:mm — local start time. */
  startTime: string | null;
  /** HH:mm — local end time. */
  endTime: string | null;
  /** YYYY-MM-DD — only present when shift crosses midnight. */
  endDate: string | null;

  /**
   * Raw duration from startTime to endTime in hours (decimal string).
   * Overnight-safe: a shift from 22:00 to 02:00 yields "4.00", not "-20.00".
   * Formula: ((endDatetime - startDatetime).seconds / 3600)
   */
  grossDurationHours: string;

  /** Mirrors Shift.breakTaken. */
  breakTaken: boolean;
  /**
   * Minutes deducted from gross duration.
   * = contract.defaultBreakMinutes when breakTaken is true, else 0.
   * BI reads defaultBreakMinutes from the Shift's assigned Contract.
   */
  appliedBreakMinutes: number;

  /**
   * Net worked hours (decimal string).
   * Formula: max(0, grossDurationHours - appliedBreakMinutes/60)
   * Precision: 2 decimal places.
   */
  workedHours: string;

  /** Rate type from the Contract ('fixed' | 'variable' | 'variable_time_range'). */
  rateType: string;
  /**
   * Resolved hourly rate (decimal string).
   * Derived from Contract.rates[] by matching day-of-week and optionally time range.
   */
  appliedRate: string;
  /** Currency inherited from the Contract. */
  currency: string;

  /**
   * Line amount (decimal string).
   * Formula: workedHours × appliedRate, decimal-safe arithmetic.
   */
  amount: string;

  calculationStatus: ShiftCalcStatus;
  /** Human-readable reason when status is 'warning' or 'error'. */
  calculationNote: string | null;
}

// ─── Billing group (one per customer × billing period) ───────────────────────

export interface PendingInvoiceGroup {
  /**
   * Deterministic group ID.
   * Derived from: sha256(companyId + customerId + contractId + periodStart + periodEnd).
   * Used by the frontend to track per-row loading state and prevent double approval.
   */
  groupId: string;

  companyId: string;
  customerId: string;
  customerName: string;
  contractId: string;
  /** positionName from the Contract. */
  contractTitle: string;
  billingCycle: string;
  /** YYYY-MM-DD — inclusive start of the billing period. */
  periodStart: string;
  /** YYYY-MM-DD — inclusive end of the billing period. */
  periodEnd: string;
  currency: string;

  shiftCount: number;
  /** Sum of workedHours across all shift rows (decimal string). */
  totalWorkedHours: string;
  /** Sum of line amounts (decimal string). */
  subtotal: string;
  /** GST rate as percentage string, or null when chargeGst=false. */
  taxRate: string | null;
  /** Tax component (decimal string). */
  taxAmount: string;
  /** subtotal + taxAmount (decimal string). */
  total: string;

  status: PendingGroupStatus;
  /** Non-blocking notes. */
  warnings: string[];
  /**
   * Blocking conditions.
   * Examples:
   *   - 'No valid rate for shift on Sunday'
   *   - 'Shift SH-xxx is missing a Contract'
   *   - 'Mixed currencies within billing group'
   *   - 'Negative worked hours on shift SH-xxx'
   */
  errors: string[];
  /** false when errors is non-empty. */
  isApprovable: boolean;

  shiftDetails: PendingShiftCalculation[];
  calculatedAt: string;
}

// ─── Top-level BI result ──────────────────────────────────────────────────────

export interface PendingInvoiceGroupsResult {
  companyId: string;
  groups: PendingInvoiceGroup[];
  totalGroups: number;
  approvableGroups: number;
  calculatedAt: string;
}
