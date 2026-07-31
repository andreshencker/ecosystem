// src/payments/providers/stripe/stripe.gateway-guide.ts
//
// Integration guide for the Stripe payment provider.
// This data drives the /payments/gateway developer portal page.
// No content from this file is hardcoded in the generic frontend.

import type { GatewayGuide } from '../../contracts/payment-gateway-guide.contract';

export const STRIPE_GATEWAY_GUIDE: GatewayGuide = {
  providerKey: 'stripe',
  displayName: 'Stripe',
  description:
    'Stripe is a full-featured payment platform supporting card payments, bank transfers, and buy-now-pay-later via redirect and embedded flows.',

  prerequisites: [
    'A Stripe account connected to Communications (Settings → Provider Credentials).',
    'At least one active payment connection with a valid API key.',
    'A valid Communications Bearer token — issued by the Auth module on login.',
    'Your application can make HTTPS requests to the Communications API.',
    'A publicly reachable HTTPS URL for the redirect flow return destination.',
    'For the embedded flow: include the Stripe.js library in your frontend (loaded from https://js.stripe.com — never from your own server).',
  ],

  supportedFlows: [
    'Redirect — payer is sent to a Stripe-hosted checkout page and returned to your app on completion.',
    'Embedded — Stripe Payment Element is mounted inside your own UI. Your app never handles raw card data.',
    'Payment Intent — direct server-to-server payment creation for non-browser contexts or already-saved payment methods.',
  ],

  implementationSteps: [
    {
      stepNumber: 1,
      title: 'Authenticate using Communications Token',
      description:
        'All requests to Communications must include a valid Bearer token. ' +
        'Your application authenticates once and passes the token in every subsequent API call. ' +
        'Communications resolves the company, permissions, and available payment connections from this token — ' +
        'your application never sends credentials, provider keys, or companyId in the request body.',
      codeExample: `// Attach the token to every Communications API request
const headers = {
  Authorization: \`Bearer \${communicationsToken}\`,
  'Content-Type': 'application/json',
};`,
      language: 'typescript',
      notes: [
        'Tokens expire — refresh before they expire using the Communications refresh token flow.',
        'Never send provider secret keys, signing secrets, or companyId from your application.',
        'Communications resolves companyId server-side from the authenticated token.',
      ],
    },
    {
      stepNumber: 2,
      title: 'Load Payment Connections',
      description:
        'Fetch the list of available payment connections for the authenticated company. ' +
        'Each connection maps to a configured Stripe credential (test or live). ' +
        'Display these to the operator so they can select which connection to use for payments.',
      codeExample: `GET /payments/accounts
Authorization: Bearer <token>

// Response:
{
  "data": [
    {
      "id": "6776e4f1a0c1234567890abc",
      "providerKey": "stripe",
      "tag": "production",
      "displayIdentifier": "pk_live_...",
      "environment": "live",
      "isActive": true
    },
    {
      "id": "6776e4f1a0c1234567890def",
      "providerKey": "stripe",
      "tag": "test",
      "displayIdentifier": "pk_test_...",
      "environment": "test",
      "isActive": true
    }
  ]
}`,
      language: 'json',
      notes: [
        'Store only the connection id (account id) — never store raw credentials.',
        'Use the test connection during development; switch to the live connection in production.',
        'The environment field ("test" | "live") tells your UI which badge to show.',
      ],
    },
    {
      stepNumber: 3,
      title: 'Save the Selected Connection ID',
      description:
        'Your application stores the selected payment connection id (the account id) in its own settings. ' +
        'This id is passed to all subsequent payment operations. ' +
        'It identifies which Stripe credential Communications should use — but it is not a credential itself.',
      codeExample: `// Store in your application settings — NOT a secret
const paymentSettings = {
  connectionId: '6776e4f1a0c1234567890abc',
  environment: 'live',
};`,
      language: 'typescript',
      notes: [
        'The connectionId is a MongoDB ObjectId — it is opaque and not guessable but is not secret.',
        'Store it alongside your other application configuration (e.g. database, env variable).',
        'Your application should allow operators to change the selected connection without a code deploy.',
      ],
    },
    {
      stepNumber: 4,
      title: 'Create a Payment Session',
      description:
        'When a customer is ready to pay, your application creates a payment session by calling the Communications session endpoint. ' +
        'You provide the connection id, the amount, currency, a reference, and the return/cancel URLs. ' +
        'Communications resolves the provider credentials and creates a Stripe-native session on your behalf.',
      codeExample: `POST /payments/accounts/{connectionId}/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "amountMinor": 15000,
  "paymentUnitCode": "AUD",
  "reference": "invoice-2024-001",
  "returnUrl": "https://your-app.com/payments/success",
  "cancelUrl": "https://your-app.com/payments/cancelled",
  "presentationType": "redirect"
}`,
      language: 'json',
      notes: [
        'amountMinor is the amount in the smallest currency unit (e.g. cents). AUD 150.00 = 15000.',
        'paymentUnitCode is the ISO 4217 currency code in uppercase.',
        'reference is your internal identifier — store it to link the session back to your business record.',
        'presentationType controls which Stripe flow is used: "redirect" (Stripe Checkout) or "embedded" (Payment Element).',
        "returnUrl and cancelUrl must be HTTPS URLs accessible from the customer's browser.",
      ],
    },
    {
      stepNumber: 5,
      title: 'Render the Payment Experience',
      description:
        'Your application is responsible for the entire payment UI. ' +
        "For the redirect flow, redirect the customer's browser to the redirectUrl returned in the session response. " +
        'For the embedded flow, mount the Stripe Payment Element using the clientSecret returned in the session response.',
      codeExample: `// Redirect flow — send the customer to Stripe
window.location.href = session.redirectUrl;

// Embedded flow — mount Stripe Payment Element
const stripe = Stripe(session.publishableKey);
const elements = stripe.elements({ clientSecret: session.clientSecret });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');`,
      language: 'typescript',
      notes: [
        'Communications never renders payment forms — your application owns the full payment UI.',
        'The publishableKey in the embedded response is safe to include in frontend code.',
        'For the redirect flow, show a loading spinner while the customer is redirected.',
        'Build your own success, failure, and retry screens.',
      ],
    },
    {
      stepNumber: 6,
      title: 'Complete Customer Authentication (3DS)',
      description:
        "For cards requiring Strong Customer Authentication (SCA / 3DS), Stripe will redirect the customer through the bank's authentication screen automatically. " +
        'In the embedded flow, Stripe.js handles 3DS prompts inline. ' +
        'In the redirect flow, this happens transparently on the Stripe-hosted page. ' +
        'Your application does not need to implement 3DS logic directly.',
      notes: [
        'European cards frequently require 3DS. Design your payment UI to handle a "requires_customer_action" status.',
        'Stripe.js confirmPayment() in the embedded flow handles 3DS internally.',
        'Never mark a payment as complete until Communications confirms the canonical status is "succeeded".',
        'A "requires_customer_action" status means the customer must complete an additional authentication step.',
      ],
    },
    {
      stepNumber: 7,
      title: 'Query the Canonical Payment Status',
      description:
        'After the customer completes (or abandons) the payment, query Communications for the final canonical status. ' +
        'Do not trust the return URL parameters alone — always confirm status server-side via Communications. ' +
        'The canonical status is provider-independent: your business logic only needs to handle Communications statuses.',
      codeExample: `GET /payments/accounts/{connectionId}/sessions/{sessionId}
Authorization: Bearer <token>

// Canonical response:
{
  "id": "sess_abc123",
  "status": "succeeded",
  "reference": "invoice-2024-001",
  "paymentId": "pay_xyz789",
  "amount": { "amountMinor": 15000, "currency": "aud" }
}`,
      language: 'json',
      notes: [
        'Always check status server-side — never rely on URL parameters from the return redirect.',
        'Canonical statuses: requires_customer_action | processing | succeeded | failed | cancelled | expired.',
        'Only mark the order as paid when status === "succeeded".',
        'For webhook-driven status updates, configure a webhook endpoint on the Webhooks page.',
      ],
    },
  ],

  requestExamples: [
    {
      label: 'List Payment Connections',
      description:
        'Retrieve all active payment connections for the authenticated company.',
      method: 'GET',
      path: '/payments/accounts',
      headers: {
        Authorization: 'Bearer <communications_token>',
      },
    },
    {
      label: 'Create Payment Session (Redirect)',
      description:
        'Create a Stripe Checkout session. The customer is redirected to Stripe-hosted page.',
      method: 'POST',
      path: '/payments/accounts/{connectionId}/sessions',
      headers: {
        Authorization: 'Bearer <communications_token>',
        'Content-Type': 'application/json',
      },
      body: {
        amountMinor: 15000,
        paymentUnitCode: 'AUD',
        reference: 'invoice-2024-001',
        returnUrl:
          'https://your-app.com/payments/success?ref={CHECKOUT_SESSION_ID}',
        cancelUrl: 'https://your-app.com/payments/cancelled',
        presentationType: 'redirect',
        metadata: {
          orderId: 'ord_abc123',
          customerId: 'cust_xyz789',
        },
      },
    },
    {
      label: 'Create Payment Session (Embedded)',
      description:
        'Create a Payment Intent. The clientSecret is passed to Stripe.js for the embedded Payment Element.',
      method: 'POST',
      path: '/payments/accounts/{connectionId}/sessions',
      headers: {
        Authorization: 'Bearer <communications_token>',
        'Content-Type': 'application/json',
      },
      body: {
        amountMinor: 15000,
        paymentUnitCode: 'AUD',
        reference: 'invoice-2024-001',
        returnUrl: 'https://your-app.com/payments/complete',
        presentationType: 'embedded',
      },
    },
    {
      label: 'Query Payment Session Status',
      description:
        'Check the canonical status of a session after the customer returns.',
      method: 'GET',
      path: '/payments/accounts/{connectionId}/sessions/{sessionId}',
      headers: {
        Authorization: 'Bearer <communications_token>',
      },
    },
    {
      label: 'List Payments',
      description:
        'List completed payments for a connection with optional filters.',
      method: 'GET',
      path: '/payments/accounts/{connectionId}/payments',
      headers: {
        Authorization: 'Bearer <communications_token>',
      },
    },
  ],

  responseExamples: [
    {
      label: 'Session Created — Redirect Mode',
      description:
        "Redirect the customer's browser to redirectUrl immediately after receiving this response.",
      statusCode: 201,
      body: {
        id: 'sess_abc123def456',
        accountId: '6776e4f1a0c1234567890abc',
        status: 'pending',
        presentationType: 'redirect',
        amount: { amountMinor: 15000, currency: 'aud' },
        reference: 'invoice-2024-001',
        redirectUrl: 'https://checkout.stripe.com/pay/cs_test_...',
        successUrl: 'https://your-app.com/payments/success',
        cancelUrl: 'https://your-app.com/payments/cancelled',
        expiresAt: '2024-12-01T12:00:00.000Z',
        createdAt: '2024-12-01T11:00:00.000Z',
      },
    },
    {
      label: 'Session Created — Embedded Mode',
      description:
        'Pass clientSecret to Stripe.js to mount the Payment Element. publishableKey is safe for frontend use.',
      statusCode: 201,
      body: {
        id: 'sess_embedded_xyz789',
        accountId: '6776e4f1a0c1234567890abc',
        status: 'pending',
        presentationType: 'embedded',
        amount: { amountMinor: 15000, currency: 'aud' },
        reference: 'invoice-2024-001',
        clientSecret: 'pi_3xxx_secret_yyy',
        publishableKey: 'pk_test_...',
        expiresAt: '2024-12-01T12:00:00.000Z',
        createdAt: '2024-12-01T11:00:00.000Z',
      },
    },
    {
      label: 'Session Status — Succeeded',
      description: 'Payment completed successfully. Safe to fulfil the order.',
      statusCode: 200,
      body: {
        id: 'sess_abc123def456',
        status: 'succeeded',
        amount: { amountMinor: 15000, currency: 'aud' },
        reference: 'invoice-2024-001',
        paymentId: 'pay_xyz789abc',
        completedAt: '2024-12-01T11:05:32.000Z',
      },
    },
    {
      label: 'Session Status — Requires Customer Action',
      description:
        'Customer must complete additional authentication (3DS). Prompt the customer to return to the payment.',
      statusCode: 200,
      body: {
        id: 'sess_abc123def456',
        status: 'requires_customer_action',
        amount: { amountMinor: 15000, currency: 'aud' },
        reference: 'invoice-2024-001',
        paymentId: null,
      },
    },
  ],

  presentationTypes: [
    {
      mode: 'redirect',
      label: 'Redirect',
      description:
        'The customer is redirected to a Stripe-hosted checkout page. No frontend Stripe SDK required. ' +
        'Stripe handles the entire payment UI, including card collection, 3DS, and wallet pay.',
      recommendedFor: [
        'Server-rendered applications (Rails, Laravel, Django)',
        'Mobile web applications',
        'Situations where Stripe.js cannot be loaded',
        'Maximum security — card data never touches your servers or frontend',
      ],
      supported: true,
    },
    {
      mode: 'embedded',
      label: 'Embedded',
      description:
        'The Stripe Payment Element is mounted inside your own UI using Stripe.js. ' +
        'Your application controls the page layout and branding around the payment form. ' +
        'Card data is collected directly by Stripe.js and tokenised in the browser — never passed to your servers.',
      recommendedFor: [
        'React, Vue, Angular, Next.js single-page applications',
        'Applications that require consistent branding around the payment form',
        'Checkout flows where redirect would break the user experience',
      ],
      supported: true,
    },
    {
      mode: 'hosted_page',
      label: 'Hosted Page',
      description:
        'A Communications-generated payment link is sent to the customer via email or SMS. ' +
        'The customer opens the link and completes payment on a Communications-hosted page.',
      recommendedFor: [
        'Invoice payment links',
        'Async payment collection where the customer is not present in the app',
        'Email-driven payment workflows',
      ],
      supported: false,
    },
    {
      mode: 'qr_code',
      label: 'QR Code',
      description:
        'A QR code is generated for the payment session. The customer scans it with their mobile device to complete payment.',
      recommendedFor: [
        'Point-of-sale terminals',
        'Physical invoice or receipt',
        'Retail environments',
      ],
      supported: false,
    },
    {
      mode: 'deep_link',
      label: 'Deep Link',
      description:
        "The payment is initiated by opening a deep link in the customer's banking or wallet application.",
      recommendedFor: [
        'Native mobile applications',
        'Open Banking (NPP, PayTo, OSKO)',
        'Crypto wallet payments',
      ],
      supported: false,
    },
  ],

  testingInstructions: [
    'Use a test-mode connection (environment: "test") — the displayIdentifier starts with pk_test_.',
    'Use the Payment Testing page (Payments → Payment Testing) to create test payments without a browser checkout.',
    'Stripe test cards: 4242 4242 4242 4242 (instant success), 4000 0000 0000 3220 (3DS required), 4000 0000 0000 9995 (insufficient funds).',
    'Any future expiry date (e.g. 12/34) and any 3-digit CVC (e.g. 123) are valid in test mode.',
    'Test webhook delivery by configuring a webhook endpoint pointing to a tunnelled local URL (e.g. ngrok, Cloudflare Tunnel).',
    'The webhook delivery log (Payments → Webhooks → Event Deliveries) shows the full history of received events.',
    'Never use live Stripe credentials in development — Stripe test mode payments are completely isolated from live mode.',
    'Switch to a live-mode connection only in production and only after your integration has been fully validated in test mode.',
  ],

  limitations: [
    'Stripe Checkout sessions (redirect mode) expire after 24 hours if not completed.',
    'Payment amounts are immutable after session creation — cancel and create a new session to change the amount.',
    'The embedded Payment Element requires Stripe.js to be loaded from https://js.stripe.com — do not self-host it.',
    'Payment status transitions are asynchronous — always confirm via Communications API or webhook before fulfilling orders.',
    'Stripe rate limits apply to the underlying API calls. Implement retry with exponential back-off on 429 errors.',
    'Communications never stores raw card data, CVCs, or full PANs. All sensitive card information is handled by Stripe.js or Stripe servers.',
    "Refunds may take 5–10 business days to appear on the customer's statement regardless of the API response.",
    'The clientSecret returned in embedded mode is valid for 24 hours and must not be stored persistently.',
  ],

  webhookReceiverPath: 'POST /payments/webhooks/stripe/{connectionId}',
};
