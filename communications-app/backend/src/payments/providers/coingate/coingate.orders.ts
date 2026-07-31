// src/payments/providers/coingate/coingate.orders.ts
//
// CoinGate order operations: create, list, get.
// Maps raw CoinGate Order objects to canonical Graphify Payment contracts.
//
// CoinGate pagination: page/per_page (not cursor-based).
// The next page number is encoded as a base64 JSON cursor so the canonical
// PaymentListResult contract (hasMore + nextCursor) is preserved.
//
// No local Order records are created or persisted.

import * as crypto from 'crypto';
import type { CoinGateClient } from './coingate.client';
import type {
  CoinGateOrder,
  CoinGateListOrdersResponse,
} from './coingate.types';
import type {
  PaymentSummary,
  PaymentDetail,
  PaymentListResult,
  ListPaymentsParams,
} from '../../contracts/payment-list.contract';
import {
  mapCoinGateOrderStatus,
  toDecimalAmount,
  toMinorUnits,
} from './coingate.mapper';
import type { PaymentProviderContext } from '../../types/payment.types';

// ─── Cursor encoding (exported for testing) ───────────────────────────────────

export function encodeCursor(page: number): string {
  return Buffer.from(JSON.stringify({ page })).toString('base64url');
}

export function decodeCursor(cursor: string): number {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { page?: number };
    return Math.max(1, Number(parsed.page) || 1);
  } catch {
    return 1;
  }
}

// ─── Callback token ───────────────────────────────────────────────────────────

/**
 * Generates a deterministic callback validation token for a CoinGate order.
 *
 * Security:
 *   - Derived from credentialId + externalReference using SHA-256.
 *   - Stateless: can be re-derived from the same inputs on callback receipt.
 *   - Does NOT use the CoinGate API token as key material.
 *   - 32 hex chars = 128 bits of entropy, sufficient for callback validation.
 */
export function generateCallbackToken(
  credentialId: string,
  externalReference: string,
): string {
  return crypto
    .createHash('sha256')
    .update(`${credentialId}:${externalReference}:coingate-callback-v1`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Verifies a CoinGate callback token against the expected derived value.
 */
export function verifyCallbackToken(
  receivedToken: string,
  credentialId: string,
  externalReference: string,
): boolean {
  const expected = generateCallbackToken(credentialId, externalReference);
  // Constant-time comparison to prevent timing attacks.
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedToken, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );
  } catch {
    return false;
  }
}

// ─── Order → PaymentSummary mapping ──────────────────────────────────────────

function mapOrderToSummary(
  order: CoinGateOrder,
  accountId: string,
): PaymentSummary {
  const canonicalStatus = mapCoinGateOrderStatus(order.status);
  const requiresUserAction =
    order.status === 'new' || order.status === 'pending';

  const priceMinor = toMinorUnits(order.price_amount ?? '0', order.price_currency);

  return {
    id: String(order.id),
    accountId,
    providerKey: 'coingate',
    providerPaymentId: String(order.id),
    amountMinor: priceMinor,
    currency: order.price_currency.toLowerCase(),
    status: canonicalStatus,
    providerStatus: order.status,
    description: order.order_id ?? order.description,
    createdAt: new Date(order.created_at),
    requiresUserAction,
  };
}

// ─── Order → PaymentDetail mapping ───────────────────────────────────────────

function mapOrderToDetail(
  order: CoinGateOrder,
  accountId: string,
): PaymentDetail {
  const summary = mapOrderToSummary(order, accountId);

  const paidMinor = order.pay_amount
    ? toMinorUnits(order.pay_amount, order.pay_currency ?? order.price_currency)
    : undefined;
  const receiveMinor = order.receive_amount
    ? toMinorUnits(order.receive_amount, order.receive_currency)
    : undefined;

  // Collect safe blockchain TX hashes for display (not sensitive).
  const txHashes = (order.blockchain_transactions ?? [])
    .filter((tx) => tx.txid)
    .map((tx) => tx.txid!)
    .join(', ');

  // Build safe metadata — no token, no credentials.
  const meta: Record<string, string> = {};
  if (order.order_id) meta['externalReference'] = order.order_id;
  if (order.receive_currency) meta['receiveCurrency'] = order.receive_currency;
  if (order.receive_amount) meta['receiveAmount'] = order.receive_amount;
  if (order.pay_currency) meta['payCurrency'] = order.pay_currency;
  if (order.pay_amount) meta['payAmount'] = order.pay_amount;
  if (order.payment_address) meta['paymentAddress'] = order.payment_address;
  if (txHashes) meta['blockchainTxIds'] = txHashes;
  if (order.expire_at) meta['expireAt'] = order.expire_at;
  if (order.underpaid_amount && order.underpaid_amount !== '0') {
    meta['underpaidAmount'] = order.underpaid_amount;
  }
  if (order.overpaid_amount && order.overpaid_amount !== '0') {
    meta['overpaidAmount'] = order.overpaid_amount;
  }
  if (order.confirmations !== undefined) {
    meta['confirmations'] = String(order.confirmations);
  }
  if (order.is_refundable !== undefined) {
    meta['isRefundable'] = String(order.is_refundable);
  }
  if ((order.refunds ?? []).length > 0) {
    meta['refundCount'] = String(order.refunds!.length);
  }

  return {
    ...summary,
    amountReceivedMinor: paidMinor,
    receiptUrl: order.payment_url,
    providerMetadata: Object.keys(meta).length > 0 ? meta : undefined,
  };
}

// ─── Public operations ────────────────────────────────────────────────────────

/**
 * Creates a CoinGate order from a canonical payment creation request.
 *
 * Returns the PaymentDetail and the provider payment URL.
 * The caller is responsible for returning the payment URL to the user.
 */
export async function createCoinGateOrder(
  client: CoinGateClient,
  context: PaymentProviderContext,
  params: CreateCoinGateOrderParams,
): Promise<{ detail: PaymentDetail; paymentUrl?: string }> {
  const callbackToken = generateCallbackToken(
    context.credentialsId,
    params.externalReference,
  );

  const priceAmount = toDecimalAmount(params.amountMinor, params.priceCurrency);

  const body: Record<string, unknown> = {
    price_amount: priceAmount,
    price_currency: params.priceCurrency,
    title: params.title ?? `Order ${params.externalReference}`,
    description: params.description ?? `Payment ${params.externalReference}`,
    order_id: params.externalReference,
    token: callbackToken,
  };

  if (params.receiveCurrency) body['receive_currency'] = params.receiveCurrency;
  if (params.callbackUrl) body['callback_url'] = params.callbackUrl;
  if (params.successUrl) body['success_url'] = params.successUrl;
  if (params.cancelUrl) body['cancel_url'] = params.cancelUrl;
  if (params.purchaserEmail) {
    body['shopper'] = { email: params.purchaserEmail };
  }

  const order = await client.post<CoinGateOrder>('/orders', body);

  return {
    detail: mapOrderToDetail(order, context.credentialsId),
    paymentUrl: order.payment_url,
  };
}

export interface CreateCoinGateOrderParams {
  amountMinor: number;
  priceCurrency: string;
  receiveCurrency?: string;
  externalReference: string;
  title?: string;
  description?: string;
  callbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  purchaserEmail?: string;
}

/**
 * Lists CoinGate orders as canonical PaymentListResult.
 *
 * CoinGate uses page/per_page pagination. The next page number is encoded
 * as a base64 JSON cursor so the canonical hasMore + nextCursor contract works.
 */
export async function listCoinGateOrders(
  client: CoinGateClient,
  accountId: string,
  params: ListPaymentsParams,
): Promise<PaymentListResult> {
  const page = params.cursor ? decodeCursor(params.cursor) : 1;
  const perPage = Math.min(params.limit ?? 20, 100);

  const queryParams: Record<string, unknown> = {
    page,
    per_page: perPage,
    sort: 'created_at_desc',
  };

  if (params.status) queryParams['status'] = params.status;
  if (params.currency) queryParams['price_currency'] = params.currency.toUpperCase();
  if (params.createdFrom) {
    queryParams['created_at[from]'] = formatDate(params.createdFrom);
  }
  if (params.createdTo) {
    queryParams['created_at[to]'] = formatDate(params.createdTo);
  }

  const response = await client.get<CoinGateListOrdersResponse>('/orders', queryParams);

  const orders = response.orders ?? [];
  const hasMore = response.current_page < response.total_pages;
  const nextPage = response.current_page + 1;

  return {
    data: orders.map((o) => mapOrderToSummary(o, accountId)),
    hasMore,
    nextCursor: hasMore ? encodeCursor(nextPage) : undefined,
  };
}

/**
 * Retrieves a single CoinGate order by its provider ID.
 */
export async function getCoinGateOrder(
  client: CoinGateClient,
  accountId: string,
  orderId: string,
): Promise<PaymentDetail> {
  const order = await client.get<CoinGateOrder>(`/orders/${orderId}`);
  return mapOrderToDetail(order, accountId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}
