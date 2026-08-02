// src/payments/providers/coingate/coingate.types.ts
//
// TypeScript types for raw CoinGate API responses.
// These types stay inside the CoinGate provider folder.
// Generic layers must never import from this file.

// ─── Orders ──────────────────────────────────────────────────────────────────

export type CoinGateOrderStatus =
  | 'new'
  | 'pending'
  | 'confirming'
  | 'paid'
  | 'invalid'
  | 'expired'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded';

export interface CoinGateBlockchainTransaction {
  id: string | number;
  txid?: string;
  amount?: string;
  confirmations?: number;
  created_at?: string;
}

export interface CoinGateOrderRefundSummary {
  id: number | string;
  amount?: string;
  status?: string;
  created_at?: string;
}

export interface CoinGateOrder {
  id: number | string;
  status: CoinGateOrderStatus;
  do_not_convert: boolean;
  price_currency: string;
  price_amount: string;
  lightning_network: boolean;
  receive_currency: string;
  receive_amount?: string;
  created_at: string;
  order_id?: string; // merchant-supplied external reference
  payment_url?: string;
  underpaid_amount?: string;
  overpaid_amount?: string;
  is_refundable?: boolean;
  token?: string; // merchant-set callback validation token
  title?: string;
  description?: string;
  /** Payment currency (crypto), set after shopper selects */
  pay_currency?: string;
  /** Payment amount in pay_currency */
  pay_amount?: string;
  /** Blockchain payment address */
  payment_address?: string;
  /** Expiry timestamp */
  expire_at?: string;
  /** Blockchain confirmations received */
  confirmations?: number;
  blockchain_transactions?: CoinGateBlockchainTransaction[];
  refunds?: CoinGateOrderRefundSummary[];
}

export interface CoinGateListOrdersResponse {
  current_page: number;
  per_page: number;
  total_orders: number;
  total_pages: number;
  orders: CoinGateOrder[];
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export type CoinGateRefundStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'failed'
  | 'cancelled';

export interface CoinGateRefundCurrency {
  id: number;
  title: string;
  symbol: string;
  type?: string;
}

export interface CoinGatePlatform {
  id: number;
  title: string;
  symbol?: string;
}

export interface CoinGateRefundCurrencyDetail {
  currency?: CoinGateRefundCurrency;
  platform?: CoinGatePlatform;
}

export interface CoinGateLedgerAccount {
  id: string | number;
  title?: string;
  currency?: CoinGateRefundCurrency;
}

export interface CoinGateRefund {
  id: number | string;
  status: CoinGateRefundStatus;
  amount?: string; // decimal amount in order price currency
  request_amount?: string;
  refund_amount?: string;
  address: string;
  address_memo?: string;
  created_at: string;
  updated_at?: string;
  reason?: string;
  email?: string;
  rejection_reason?: string;
  order?: Pick<
    CoinGateOrder,
    'id' | 'order_id' | 'price_currency' | 'price_amount'
  >;
  refund_currency?: CoinGateRefundCurrencyDetail;
  ledger_account?: CoinGateLedgerAccount;
  blockchain_transactions?: CoinGateBlockchainTransaction[];
}

export interface CoinGateRefundListResponse {
  refunds?: CoinGateRefund[];
  // Some endpoints return an array directly
}

// ─── Currencies ───────────────────────────────────────────────────────────────

export interface CoinGatePlatformEntry {
  id: number;
  title: string;
  symbol?: string;
}

export interface CoinGateCurrency {
  id: number;
  title: string;
  symbol: string;
  type: string; // 'crypto', 'native', 'token', 'fiat'
  platforms?: CoinGatePlatformEntry[];
}

// ─── Error ────────────────────────────────────────────────────────────────────

export interface CoinGateErrorBody {
  message?: string;
  reason?: string;
  errors?: Array<{ field?: string; message?: string }> | string[];
  code?: string;
}
