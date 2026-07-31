// src/payments/providers/coingate/coingate.gateway-guide.ts
//
// CoinGate integration guide for the /payments/gateway developer portal.
// Documents only the Graphify Communications canonical API.
// External applications must NEVER call CoinGate directly.

import type { GatewayGuide } from '../../contracts/payment-gateway-guide.contract';

export const COINGATE_GATEWAY_GUIDE: GatewayGuide = {
  providerKey: 'coingate',
  displayName: 'CoinGate',
  description:
    'CoinGate is a cryptocurrency payment gateway supporting Bitcoin, Ethereum, ' +
    'and 70+ other cryptocurrencies. Accept crypto payments and settle in EUR, BTC, ' +
    'or other supported currencies. Manage payments through the Graphify Payments API ' +
    '— your application never touches the CoinGate API token directly.',

  prerequisites: [
    'A CoinGate merchant account with API access enabled.',
    'A CoinGate API token from your merchant dashboard (Settings → API).',
    'For sandbox testing: a separate token from https://sandbox.coingate.com.',
    'The CoinGate provider enabled for your company in Communications.',
    'Credentials saved with the correct mode (test for sandbox, live for production).',
    'A valid Communications Bearer token — issued by the Auth module on login.',
  ],

  supportedFlows: [
    'Token-based API authentication — the Communications runtime holds the token securely.',
    'Cryptocurrency order creation via POST /payments/accounts/{connectionId}/payments.',
    'Order listing and detail via GET /payments/accounts/{connectionId}/payments.',
    'Refund creation and tracking via POST /payments/accounts/{connectionId}/refunds.',
    'Callback delivery monitoring — receive and track payment status callbacks.',
  ],

  implementationSteps: [
    {
      stepNumber: 1,
      title: 'Authenticate with Communications',
      description:
        'All requests to the Graphify Payments API use a Bearer token issued by Communications. ' +
        'The CoinGate API token is stored encrypted inside Communications and is never sent to your application.',
      codeExample: `const headers = {
  Authorization: \`Bearer \${communicationsToken}\`,
  'Content-Type': 'application/json',
};`,
      language: 'typescript',
      notes: [
        'The CoinGate API token is stored encrypted. Your application never sees it.',
        'Communications resolves company, permissions, and CoinGate credentials server-side.',
      ],
    },
    {
      stepNumber: 2,
      title: 'Load Available Currencies (PaymentUnits)',
      description:
        'Retrieve the list of supported cryptocurrencies and settlement currencies for the connection.',
      codeExample: `GET /payments/accounts/{connectionId}/payment-units
Authorization: Bearer <token>`,
      language: 'text',
      notes: [
        'Each PaymentUnit has a code, label, kind (crypto/fiat/token), and optional network.',
        'Use kind="crypto" for payment currencies and kind="fiat" for settlement currencies.',
        'currency_id and platform_id in providerMetadata are required for refund creation.',
      ],
    },
    {
      stepNumber: 3,
      title: 'Create a Payment Order',
      description:
        'Create a CoinGate order via the canonical payment creation endpoint. ' +
        'The response includes a paymentUrl to which you redirect the customer.',
      codeExample: `POST /payments/accounts/{connectionId}/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "amountMinor": 10000,
  "priceCurrency": "EUR",
  "receiveCurrency": "EUR",
  "externalReference": "your-order-ref-001",
  "title": "Order #001",
  "description": "Product purchase",
  "callbackUrl": "https://your-app.com/webhooks/coingate",
  "successUrl": "https://your-app.com/payment/success",
  "cancelUrl": "https://your-app.com/payment/cancel"
}`,
      language: 'json',
      notes: [
        'amountMinor is in the smallest unit of priceCurrency (e.g. 10000 = EUR 100.00).',
        'receiveCurrency determines your settlement — EUR, BTC, or DO_NOT_CONVERT.',
        'externalReference is your stable merchant order identifier.',
        'The response contains a redirectUrl (CoinGate-hosted payment page).',
        'Redirect the customer to the redirectUrl immediately after creation.',
      ],
    },
    {
      stepNumber: 4,
      title: 'Redirect Customer to Payment Page',
      description:
        'After order creation, redirect the customer to the CoinGate-hosted payment page. ' +
        'The customer selects their cryptocurrency and completes payment on CoinGate.',
      notes: [
        'Do NOT attempt to embed the payment page in an iframe — CoinGate blocks this.',
        'The payment session expires after 20 minutes for pending orders.',
        'New orders without currency selection expire after 2 hours.',
        'Your success/cancel URLs are called after the customer action.',
      ],
    },
    {
      stepNumber: 5,
      title: 'Handle CoinGate Callbacks',
      description:
        'CoinGate sends a POST callback to your callbackUrl when order status changes. ' +
        'Graphify validates the callback token and re-fetches the authoritative order state.',
      codeExample: `// CoinGate callback payload (POST to your callbackUrl)
{
  "id": 12345678,
  "status": "paid",
  "price_amount": "100.00",
  "price_currency": "EUR",
  "receive_currency": "EUR",
  "receive_amount": "99.50",
  "order_id": "your-order-ref-001",
  "token": "<validation-token-set-by-graphify>"
}`,
      language: 'json',
      notes: [
        'Always verify callbacks by re-fetching the order from Graphify.',
        'Never trust the callback status alone without re-fetching.',
        'Graphify validates the token field and re-fetches from CoinGate automatically.',
        'Delivery records are stored for 30 days in the WebhookDelivery collection.',
      ],
    },
    {
      stepNumber: 6,
      title: 'List and Query Orders',
      description:
        'Query the canonical Payments API to list and retrieve CoinGate orders.',
      codeExample: `GET /payments/accounts/{connectionId}/payments?page=1&per_page=20&status=paid
Authorization: Bearer <token>`,
      language: 'text',
      notes: [
        'CoinGate uses page-based pagination (page/per_page), not cursor-based.',
        'Supported status filters: new, pending, confirming, paid, invalid, expired, canceled, refunded.',
        'Filter by price_currency using the currency parameter.',
      ],
    },
    {
      stepNumber: 7,
      title: 'Create a Refund',
      description:
        'Issue a CoinGate refund via the canonical Refunds endpoint. ' +
        'CoinGate refunds require a destination wallet address, currency, and ledger account.',
      codeExample: `POST /payments/accounts/{connectionId}/refunds
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "12345678",
  "amountMinor": 10000,
  "reason": "requested_by_customer",
  "providerExtensions": {
    "address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf6M",
    "currency_id": 1,
    "platform_id": 1,
    "email": "customer@example.com",
    "ledger_account_id": "your-ledger-account-id"
  }
}`,
      language: 'json',
      notes: [
        'currency_id and platform_id come from the PaymentUnit providerMetadata.',
        'address is the customer destination wallet address.',
        'ledger_account_id identifies the CoinGate ledger account to debit.',
        'CoinGate sends an email to the customer for address confirmation unless skip_user_address_confirmation is true.',
        'CoinGate refunds are not instant — they go through a pending/processing/completed lifecycle.',
      ],
    },
  ],

  requestExamples: [
    {
      label: 'Create Payment Order',
      description: 'Create a EUR 100 CoinGate order for Bitcoin payment.',
      method: 'POST',
      path: '/payments/accounts/{connectionId}/payments',
      headers: { Authorization: 'Bearer <communications_token>' },
      body: {
        amountMinor: 10000,
        priceCurrency: 'EUR',
        receiveCurrency: 'EUR',
        externalReference: 'order-001',
        title: 'Order #001',
        description: 'Test purchase',
      },
    },
    {
      label: 'List Orders',
      description: 'List the 20 most recent paid CoinGate orders.',
      method: 'GET',
      path: '/payments/accounts/{connectionId}/payments?status=paid&per_page=20',
      headers: { Authorization: 'Bearer <communications_token>' },
    },
  ],

  responseExamples: [
    {
      label: 'Created Order',
      description: 'A newly created CoinGate order ready for payment.',
      statusCode: 200,
      body: {
        id: '12345678',
        accountId: '<connection-id>',
        providerKey: 'coingate',
        status: 'requires_action',
        providerStatus: 'new',
        amountMinor: 10000,
        currency: 'eur',
        createdAt: '2026-08-01T00:00:00.000Z',
        requiresUserAction: true,
        redirectUrl: 'https://coingate.com/invoice/12345678',
      },
    },
  ],

  presentationTypes: [
    {
      mode: 'redirect',
      label: 'Redirect',
      description:
        'Customer is redirected to the CoinGate-hosted invoice page to select ' +
        'their cryptocurrency and complete payment.',
      recommendedFor: [
        'Web applications',
        'Server-rendered pages',
        'Any context where the customer can be redirected',
      ],
      supported: true,
    },
    {
      mode: 'embedded',
      label: 'Embedded Checkout',
      description:
        'CoinGate white-label embedded checkout widget. Requires CoinGate account activation.',
      recommendedFor: ['Single-page applications that cannot redirect'],
      supported: false,
    },
  ],

  testingInstructions: [
    'Use sandbox.coingate.com for test tokens — production tokens do not work in sandbox.',
    'Configure a CoinGate connection with mode=test and a sandbox API token.',
    'Use the Payments → Payment Testing page to create sandbox orders.',
    'The test result includes a sandbox payment URL — open it to simulate the payment flow.',
    'CoinGate sandbox simulates the full payment lifecycle without real funds.',
    'Sandbox callbacks are sent to the callback URL configured at order creation.',
    'Refunds in sandbox are limited — check sandbox account capabilities first.',
  ],

  limitations: [
    'CoinGate payment sessions expire (20 min pending, 2 hours new without selection).',
    'Exchange rates are real-time and can vary between order creation and payment.',
    'CoinGate does not support traditional card payments — crypto-only.',
    'Refunds require a valid crypto destination address — cannot refund to bank accounts.',
    'Refunds may take time due to CoinGate compliance review.',
    'Payouts (Send Requests) require CoinGate account feature activation.',
    'White-label Checkout requires CoinGate Business account and activation.',
    'CoinGate does not have webhook endpoint CRUD — callback URLs are set per-order.',
  ],

  webhookReceiverPath: 'POST /payments/webhooks/coingate/{connectionId}',
};
