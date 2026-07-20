/**
 * Presentational formatters for Contract selectors.
 *
 * Multiple Contracts may share the same position name but belong to different
 * Customers. These formatters ensure every option is uniquely identifiable.
 *
 * The submitted value is always contractId — customerId and customerName are
 * never sent by the frontend. The Business App backend resolves customerId from
 * the selected Contract.
 */

import type { Contract, ContractStatus, BillingCycle } from '@/types/contract';

/** BILLING_CYCLE_LABELS inlined to avoid circular imports with the full type file. */
const BILLING_CYCLE_SHORT: Record<BillingCycle, string> = {
  per_shift:   'Per shift',
  daily:       'Daily',
  weekly:      'Weekly',
  fortnightly: 'Fortnightly',
  monthly:     'Monthly',
};

const STATUS_SHORT: Record<ContractStatus, string> = {
  draft:     'Draft',
  active:    'Active',
  inactive:  'Inactive',
  finished:  'Finished',
  cancelled: 'Cancelled',
};

/**
 * Primary label for a Contract selector option.
 *
 * Format:  "Customer Name — Position"
 * Fallback: "Unknown customer — Position"  when customerName is null/empty
 *
 * @example
 *   formatContractLabel({ customerName: 'Jay Productions', positionName: 'Audiovisual Technician' })
 *   // 'Jay Productions — Audiovisual Technician'
 *
 *   formatContractLabel({ customerName: null, positionName: 'Technician' })
 *   // 'Unknown customer — Technician'
 */
export function formatContractLabel(
  contract: Pick<Contract, 'customerName' | 'positionName'>,
): string {
  const customer = contract.customerName?.trim() || 'Unknown customer';
  return `${customer} — ${contract.positionName}`;
}

/**
 * Secondary metadata line shown beneath the primary label in the open dropdown.
 *
 * Format: "Active · Weekly"
 */
export function formatContractSecondary(
  contract: Pick<Contract, 'status' | 'billingCycle'>,
): string {
  const status  = STATUS_SHORT[contract.status]       ?? contract.status;
  const billing = BILLING_CYCLE_SHORT[contract.billingCycle] ?? contract.billingCycle;
  return `${status} · ${billing}`;
}
