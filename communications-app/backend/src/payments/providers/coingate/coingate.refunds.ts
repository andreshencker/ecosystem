// src/payments/providers/coingate/coingate.refunds.ts
//
// CoinGate refund operations: list, get, create.
//
// CoinGate refunds require fields not present in the generic CreateRefundParams:
//   - address       (destination wallet address)
//   - currency_id   (CoinGate integer currency identifier from GET /currencies)
//   - platform_id   (CoinGate integer platform identifier)
//   - reason        (string justification)
//   - email         (customer notification address)
//   - ledger_account_id (CoinGate account to debit funds from)
//   - address_memo  (optional: destination tag/memo)
//
// These extra fields are passed via CoinGateRefundParams which extends the
// canonical CreateRefundParams with the providerExtensions bag.
//
// No local Refund records are persisted.

import type { CoinGateClient } from './coingate.client';
import type {
  CoinGateRefund,
  CoinGateRefundListResponse,
} from './coingate.types';
import type {
  RefundSummary,
  RefundDetail,
  RefundListResult,
  CreateRefundParams,
  ListRefundsParams,
} from '../../contracts/payment-refund-list.contract';
import { mapCoinGateRefundStatus } from './coingate.mapper';
import { toMinorUnits } from './coingate.mapper';

// ─── Refund → canonical mapping ───────────────────────────────────────────────

function mapRefundToSummary(
  refund: CoinGateRefund,
  accountId: string,
  orderId: string,
): RefundSummary {
  const currency =
    refund.refund_currency?.currency?.symbol?.toLowerCase() ??
    refund.order?.price_currency?.toLowerCase() ??
    'unknown';

  const amount = refund.refund_amount ?? refund.request_amount ?? refund.amount ?? '0';
  const amountMinor = toMinorUnits(amount, currency.toUpperCase());

  return {
    id: String(refund.id),
    accountId,
    providerKey: 'coingate',
    providerRefundId: String(refund.id),
    providerPaymentId: orderId,
    amountMinor,
    currency,
    status: mapCoinGateRefundStatus(refund.status),
    providerStatus: refund.status,
    reason: refund.reason,
    createdAt: new Date(refund.created_at),
    ...(refund.rejection_reason
      ? {
          failureCode: 'rejected',
          failureMessage: refund.rejection_reason,
        }
      : {}),
  };
}

function mapRefundToDetail(
  refund: CoinGateRefund,
  accountId: string,
  orderId: string,
): RefundDetail {
  const summary = mapRefundToSummary(refund, accountId, orderId);

  return {
    ...summary,
    // Safe blockchain TX info in metadata only.
    providerMetadata: (() => {
      const m: Record<string, string> = {};
      if (refund.address) m['destinationAddress'] = refund.address;
      if (refund.address_memo) m['destinationMemo'] = refund.address_memo;
      if (refund.email) m['notificationEmail'] = refund.email;
      const txHashes = (refund.blockchain_transactions ?? [])
        .filter((tx) => tx.txid)
        .map((tx) => tx.txid!);
      if (txHashes.length > 0) m['blockchainTxIds'] = txHashes.join(', ');
      if (refund.ledger_account?.id !== undefined) {
        m['ledgerAccountId'] = String(refund.ledger_account.id);
      }
      return Object.keys(m).length > 0 ? m : undefined;
    })(),
  };
}

// ─── Public operations ────────────────────────────────────────────────────────

/**
 * Lists refunds for a CoinGate order.
 *
 * CoinGate refunds are scoped to an order. The `search` filter is interpreted
 * as the order ID to list refunds for.
 *
 * When `search` is absent in params, a refund listing across all orders is not
 * directly supported by the CoinGate API — this is a known limitation.
 */
export async function listCoinGateRefunds(
  client: CoinGateClient,
  accountId: string,
  params: ListRefundsParams,
): Promise<RefundListResult> {
  const orderId = params.search;

  if (!orderId) {
    // Without an orderId, return empty — CoinGate doesn't support listing
    // all refunds across all orders without filtering by order.
    return { data: [], hasMore: false };
  }

  const response = await client.get<CoinGateRefundListResponse | CoinGateRefund[]>(
    `/orders/${orderId}/refunds`,
  );

  let refunds: CoinGateRefund[] = [];
  if (Array.isArray(response)) {
    refunds = response;
  } else if (response && 'refunds' in response && Array.isArray(response.refunds)) {
    refunds = response.refunds;
  }

  return {
    data: refunds.map((r) => mapRefundToSummary(r, accountId, orderId)),
    hasMore: false, // CoinGate returns all refunds for an order at once
  };
}

/**
 * Retrieves a single refund by orderId and refundId.
 * The paymentId (orderId) must be the CoinGate order ID.
 */
export async function getCoinGateRefund(
  client: CoinGateClient,
  accountId: string,
  paymentId: string,
  refundId: string,
): Promise<RefundDetail> {
  const refund = await client.get<CoinGateRefund>(
    `/orders/${paymentId}/refunds/${refundId}`,
  );
  return mapRefundToDetail(refund, accountId, paymentId);
}

/**
 * Creates a CoinGate refund.
 *
 * The canonical CreateRefundParams is insufficient for CoinGate refunds.
 * CoinGate-specific fields are passed via params.providerExtensions:
 *   address           (required) wallet address to refund to
 *   currency_id       (required) CoinGate currency ID
 *   platform_id       (required) CoinGate platform ID
 *   email             (required) customer notification email
 *   ledger_account_id (required) ledger account to debit from
 *   address_memo      (optional) memo/tag for address
 *   callback_url      (optional) refund status webhook URL
 *   skip_user_address_confirmation (optional) bypass email verification
 */
export async function createCoinGateRefund(
  client: CoinGateClient,
  accountId: string,
  params: CreateRefundParams & { providerExtensions?: Record<string, unknown> },
): Promise<RefundDetail> {
  const { paymentId, amountMinor, reason, providerExtensions = {} } = params;

  if (!providerExtensions['address']) {
    throw new Error('CoinGate refund requires a destination wallet address (providerExtensions.address)');
  }
  if (!providerExtensions['currency_id']) {
    throw new Error('CoinGate refund requires a currency_id (providerExtensions.currency_id)');
  }
  if (!providerExtensions['platform_id']) {
    throw new Error('CoinGate refund requires a platform_id (providerExtensions.platform_id)');
  }
  if (!providerExtensions['email']) {
    throw new Error('CoinGate refund requires an email for customer notification (providerExtensions.email)');
  }
  if (!providerExtensions['ledger_account_id']) {
    throw new Error('CoinGate refund requires a ledger_account_id (providerExtensions.ledger_account_id)');
  }

  // First fetch the order to get price_currency for amount conversion.
  const order = await client.get<{ price_amount: string; price_currency: string }>(
    `/orders/${paymentId}`,
  );
  const priceCurrency = order.price_currency;

  // CoinGate refund amount is a decimal in the order's price currency.
  let amountDecimal: string;
  if (amountMinor !== undefined) {
    const factor = Math.pow(10, 2); // EUR/USD typically
    amountDecimal = (amountMinor / factor).toFixed(2);
  } else {
    // Full refund: use order's price_amount
    amountDecimal = order.price_amount;
  }

  const body: Record<string, unknown> = {
    amount: amountDecimal,
    address: providerExtensions['address'],
    currency_id: providerExtensions['currency_id'],
    platform_id: providerExtensions['platform_id'],
    reason: reason ?? providerExtensions['reason'] ?? 'requested_by_customer',
    email: providerExtensions['email'],
    ledger_account_id: providerExtensions['ledger_account_id'],
  };

  if (providerExtensions['address_memo']) {
    body['address_memo'] = providerExtensions['address_memo'];
  }
  if (providerExtensions['callback_url']) {
    body['callback_url'] = providerExtensions['callback_url'];
  }
  if (providerExtensions['skip_user_address_confirmation'] !== undefined) {
    body['skip_user_address_confirmation'] = providerExtensions['skip_user_address_confirmation'];
  }

  const refund = await client.post<CoinGateRefund>(
    `/orders/${paymentId}/refunds`,
    body,
  );

  return mapRefundToDetail(refund, accountId, paymentId);
}
