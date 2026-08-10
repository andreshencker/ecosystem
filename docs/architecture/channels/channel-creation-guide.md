# Channel Creation Guide

> Canonical reference for creating a new Communication Channel.
> Every future channel must follow this guide without exception.

---

## 1. Purpose

A **Channel** represents a single, named business responsibility within the Communications Platform.

Each channel answers one question:

> "What kind of external capability does this company need?"

Examples of channels currently registered in the platform:

| Channel key | Business responsibility |
|---|---|
| `email` | Transactional and marketing email delivery |
| `sms` | Short message service for mobile notifications |
| `storage` | File and object storage for reports and attachments |
| `calendar` | Calendar event and scheduling integrations |
| `payment` | Payment provider integrations for processing transactions |
| `accounting` | Accounting provider integrations |
| `billing` | Billing and invoicing provider integrations |

A channel is **not** a provider. A channel is **not** a feature flag. It is a stable, independently versioned business domain that owns its own business logic, capability definitions, API routes, and provider adapter contracts.

Providers implement channels. Channels never implement providers.

---

## 2. Architectural Principles

These principles are enforced by the existing infrastructure and must be respected by every channel.

### 2.1 The canonical resolution path

Every provider resolution in the platform follows exactly this order:

```
Company
  → Channel
  → Provider
  → CompanyChannelProvider (CCP)
  → ProviderCredentials
  → Decrypted credentials (in-memory only)
  → Provider Implementation
```

There is no other valid resolution path. No channel, service, or controller may bypass any step in this chain.

### 2.2 Channels own business logic

Each channel module contains its own:

- Business capability definitions (what operations this channel supports).
- Provider adapter interfaces (what a provider must implement to serve this channel).
- Domain-specific contracts and DTOs (what the channel returns to callers).
- Business error types (what goes wrong in this domain).
- HTTP controllers and service layer.

Business logic for Payment processing belongs in the Payment channel. Business logic for Invoice generation belongs in the Billing channel. Neither borrows from the other.

### 2.3 Providers own external API implementation

A provider adapter implements one channel's interface. The adapter:

- Speaks the provider's native API.
- Maps provider-native responses to the channel's canonical contracts.
- Declares capabilities honestly (`available`, `planned`, or `unsupported`).
- Keeps all provider-specific types, endpoints, and field names inside its own folder.

A provider adapter never calls another channel's infrastructure. It never touches the runtime resolver directly. It receives decrypted credentials from the channel service and uses them — nothing more.

### 2.4 The runtime owns infrastructure

`ChannelsRuntimeResolverService` is the single entry point for all credential resolution. It:

- Validates that the channel exists and is active.
- Validates that the provider belongs to the requested channel.
- Validates company ownership (the CCP must belong to the requesting company).
- Decrypts credentials in-memory for the current request only.
- Never persists decrypted credentials.
- Never returns credentials outside the resolved context.

Channel services call the runtime resolver. They do not replicate its logic.

### 2.5 Credentials belong to CompanyChannelProvider

`ProviderCredentials` are always anchored to a `CompanyChannelProvider` (CCP) record. The CCP is the ownership proof: `(company × channel × provider)`. A credential is therefore channel-scoped by design — it is impossible to use a Payment credential for an Accounting endpoint without a deliberate misconfiguration.

A company that uses Xero for both Accounting and Billing has two separate CCP records (one per channel) and two separate ProviderCredentials records, even though both share the same Xero OAuth tokens. The runtime resolver enforces this isolation in every query.

### 2.6 Infrastructure is shared

These components are shared across all channels and must never be duplicated:

| Component | Location | Owned by |
|---|---|---|
| `ChannelsRuntimeResolverService` | `src/communication/channels/runtime/` | Platform infrastructure |
| `ChannelsRuntimeResolved` type | `src/communication/channels/runtime/channels-runtime.types.ts` | Platform infrastructure |
| `Channel` schema | `src/communication/channels/channels-catalogue/schemas/` | Platform infrastructure |
| `Provider` schema | `src/communication/channels/providers/schemas/` | Platform infrastructure |
| `CompanyChannelProvider` schema | `src/communication/channels/company-channel-providers/schemas/` | Platform infrastructure |
| `ProviderCredentials` schema | `src/communication/channels/provider-credentials/schemas/` | Platform infrastructure |
| `CryptoService` | `src/communication/common/security/` | Platform infrastructure |
| `ContractSpec<T>` | `src/communication/channels/implementation/shared/credentials.types.ts` | Platform infrastructure |
| `CatalogBootstrapService` | `src/communication/channels/channels-catalogue/` | Platform infrastructure |

No channel creates its own version of any of these.

### 2.7 Capability status is always honest

Every provider capability must be declared with one of three values:

| Status | Meaning |
|---|---|
| `available` | Fully implemented, tested, and safe to call. |
| `planned` | Implementation deferred. Do not call provider APIs. |
| `unsupported` | The provider does not support this operation at all. |

A capability may only be promoted to `available` when its implementation is complete, its tests pass, and it has been verified against a real provider environment. No speculative `available` declarations.

---

## 3. Standard Channel Structure

Every channel follows this folder layout. Exact subfolder names are consistent across all channels.

```
src/{channel}/
├── {channel}.module.ts          ← NestJS module wiring
├── enums/
│   └── {channel}-capability.enum.ts   ← Capability keys + CapabilityStatus
├── interfaces/
│   └── {channel}-provider.interface.ts  ← IChannelProvider base + capability interfaces
├── contracts/
│   └── *.contract.ts            ← Canonical response shapes returned to callers
├── types/
│   └── *.types.ts               ← Internal runtime types (context, params, results)
├── errors/
│   └── {channel}.errors.ts      ← Domain error classes (not HttpExceptions)
├── dto/
│   └── *.dto.ts                 ← Request DTOs with validation decorators
├── registry/
│   └── {channel}-provider.registry.ts  ← Map<providerKey → adapter> (startup-populated)
├── services/
│   ├── {channel}-resolver.service.ts   ← Domain resolver (delegates to runtime resolver)
│   └── *.service.ts             ← Domain services (list, test, detail, etc.)
├── controllers/
│   └── *.controller.ts          ← HTTP controllers; extract context from JWT
└── providers/
    └── {provider}/              ← One subfolder per registered provider
        ├── {provider}.capabilities.ts
        ├── {provider}.credentials.contract.ts
        ├── {provider}.provider.ts
        └── *.ts                 ← Provider-specific types, mappers, clients
```

### Folder responsibilities

| Folder / file | Responsibility |
|---|---|
| `{channel}.module.ts` | Wires all services, controllers, providers, and model registrations. Imports `ChannelsRuntimeModule`. |
| `enums/` | Declares the channel's `Capability` enum and `CapabilityStatus` enum. These are channel-specific — do not import from another channel's enums. |
| `interfaces/` | Declares `IChannelProvider` (the base adapter contract) and optional capability sub-interfaces that providers may implement. |
| `contracts/` | Declares the canonical response shapes returned by channel services. These are the public API types — no provider-native types escape this layer. |
| `types/` | Internal types: runtime context shape, parameter objects, result unions. |
| `errors/` | Domain error classes that carry business meaning (e.g. `ProviderNotConfiguredError`). Controllers map these to HTTP exceptions. |
| `dto/` | Validated request DTOs for HTTP controllers. |
| `registry/` | Startup-populated immutable map of `providerKey → adapter`. Adding a new provider requires only adding it to the registry — no switch statements. |
| `services/{channel}-resolver.service.ts` | Thin domain adapter over `ChannelsRuntimeResolverService`. Calls `resolveByChannelAndProvider(companyId, '{channel}', providerKey)`. Resolves the adapter from the registry. Returns a domain-specific context. |
| `services/*.service.ts` | Domain services implementing channel business operations (list resources, create resources, test connection, etc.). Receive the resolved adapter and context from the resolver. |
| `controllers/` | HTTP layer. Extract `companyId` from `@CurrentUser()` JWT context — never from request body or query params. Delegate to services. Map domain errors to HTTP exceptions. |
| `providers/{provider}/` | Everything specific to one provider. No provider-native type, URL, or mapping lives outside this folder. |

---

## 4. Creating a New Channel

Follow these steps in order. Each step builds on the previous one.

### Step 1 — Create the channel module

Create `src/{channel}/{channel}.module.ts`. Import `ChannelsRuntimeModule` so the resolver is available to all services in the module.

```typescript
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      // Add channel-specific schemas here (if any).
      // Never re-declare Platform schemas — import them from their source modules.
    ]),
    ChannelsRuntimeModule,   // ← always required
  ],
  controllers: [...],
  providers: [...],
  exports: [...],
})
export class ChannelNameModule {}
```

Register the new module in `src/app.module.ts`.

### Step 2 — Register the channel in the catalogue

Add the channel to `CatalogBootstrapService.seedChannels()` in `src/communication/channels/channels-catalogue/catalog-bootstrap.service.ts`:

```typescript
{
  channelKey: 'newchannel',          // stable, lowercase, URL-safe
  displayName: 'New Channel',
  description: 'What this channel does',
  contentFormat: 'text',             // 'html' | 'text' | 'binary'
  supportsTemplates: false,
  supportsFiles: false,
  isActive: true,
},
```

The seed runs idempotently on every application start. No migration required. The new `channelKey` must also be added to the `ChannelKey` union in `src/communication/channels/runtime/channels-runtime.types.ts`.

### Step 3 — Create the capability enum

Create `src/{channel}/enums/{channel}-capability.enum.ts`:

```typescript
export enum ChannelNameCapability {
  // ── Page-level ─────────────────────────────────────────────────────────────
  Dashboard = 'dashboard',

  // ── Business operations ─────────────────────────────────────────────────────
  ResourceListing = 'resourceListing',
  ResourceDetail  = 'resourceDetail',
  ResourceCreation = 'resourceCreation',
  // ... add only capabilities that make sense for this channel
}

export enum ChannelNameCapabilityStatus {
  Available   = 'available',
  Planned     = 'planned',
  Unsupported = 'unsupported',
}

export type ChannelNameProviderCapabilities = {
  capabilities: Partial<Record<ChannelNameCapability, ChannelNameCapabilityStatus>>;
};
```

The status string values (`'available'`, `'planned'`, `'unsupported'`) must match the platform convention. Do not invent new status names.

### Step 4 — Create the provider interface

Create `src/{channel}/interfaces/{channel}-provider.interface.ts`. Define a base interface and optional capability sub-interfaces:

```typescript
export interface IChannelNameProvider {
  readonly providerKey: string;
  readonly displayName: string;
  readonly description: string;
  getCapabilities(): ChannelNameProviderCapabilities;
  getMetadata(): ChannelNameProviderMetadata;
}

// Only implement these when the capability is genuinely supported:

export interface IChannelNameListProvider extends IChannelNameProvider {
  readonly supportsListing: true;
  listResources(ctx: ChannelNameContext, params: ListParams): Promise<ListResult>;
}

// Add type guards alongside each sub-interface:
export function isListProvider(p: IChannelNameProvider): p is IChannelNameListProvider {
  return (p as any).supportsListing === true;
}
```

Follow the pattern established in `src/payments/interfaces/payment-provider.interface.ts`.

### Step 5 — Create the provider registry

Create `src/{channel}/registry/{channel}-provider.registry.ts`. Copy the pattern from `src/payments/registry/payment-provider.registry.ts`. The registry is a startup-populated, immutable `Map<string, IChannelNameProvider>`. No switch statements, no hardcoded provider keys in generic services.

### Step 6 — Create the domain resolver service

Create `src/{channel}/services/{channel}-resolver.service.ts`. This is the only place where the channel interacts with the platform runtime resolver:

```typescript
@Injectable()
export class ChannelNameResolverService {
  constructor(
    private readonly runtimeResolver: ChannelsRuntimeResolverService,
    private readonly registry: ChannelNameProviderRegistry,
  ) {}

  async resolveForCompany(
    companyId: string,
    providerKey: string,
  ): Promise<{ adapter: IChannelNameProvider; context: ChannelNameContext }> {
    // Fast-fail: adapter must be registered before any DB queries.
    const adapter = this.registry.resolve(providerKey);

    // Canonical path: Company → Channel('newchannel') → Provider → CCP → Credential.
    const resolved = await this.runtimeResolver.resolveByChannelAndProvider({
      companyId,
      channelKey: 'newchannel',
      providerKey,
    });

    const context: ChannelNameContext = {
      providerKey:    resolved.providerKey,
      connectionType: resolved.connectionType,
      credentialsId:  resolved.providerCredentialsId,
      isActive:       resolved.isActive,
      credentials:    resolved.credentials,
    };

    return { adapter, context };
  }

  async resolveByCredentialId(
    companyId: string,
    credentialId: string,
  ): Promise<{ adapter: IChannelNameProvider; context: ChannelNameContext }> {
    const resolved = await this.runtimeResolver.resolveByProviderCredentialsId({
      companyId,
      providerCredentialsId: credentialId,
    });

    if (resolved.channelKey !== 'newchannel') {
      throw new ChannelNameCredentialMismatchError(credentialId, 'newchannel');
    }

    const adapter = this.registry.resolve(resolved.providerKey);
    const context: ChannelNameContext = { ... };
    return { adapter, context };
  }
}
```

### Step 7 — Register the channel module in the application

Add the new module to `src/app.module.ts`:

```typescript
import { ChannelNameModule } from './channel-name/channel-name.module';

@Module({
  imports: [
    // ...existing modules
    ChannelNameModule,
  ],
})
export class AppModule {}
```

---

## 5. Creating a New Provider

Adding a provider to an existing channel requires no infrastructure changes. The runtime resolver, credential encryption, and company isolation all work automatically for any provider registered in the catalogue.

### Required steps (new provider in an existing channel)

**Step 1 — Catalogue entry**

Add the provider to `CatalogBootstrapService.seedProviders()`:

```typescript
{
  providerKey:    'newprovider',               // stable, lowercase, URL-safe
  displayName:    'New Provider',
  description:    'What this provider does',
  channelIds:     [channelDoc._id],            // exactly the channels it serves
  connectionType: 'api_key',                  // 'api_key' | 'oauth' | 'smtp' | 'token' | 'access_keys' | 'app_password'
  isActive:       true,
},
```

A provider that serves multiple channels (e.g. Xero for Accounting and Billing) lists both channel IDs in `channelIds`. One provider document, multiple channel associations.

**Step 2 — Credential contract**

Create `src/{channel}/providers/{provider}/{provider}.credentials.contract.ts` implementing `ContractSpec<TCredentials>`:

```typescript
export const NewProviderCredentialsContract: ContractSpec<NewProviderCredentials> = {
  channelKey:     '{channel}',
  connectionType: 'api_key',

  normalize(input) {
    // Accept camelCase, snake_case, and env-variable formats.
    // Whitelist fields — never store unknown keys.
    const value: NewProviderCredentials = { ... };
    return { value };
  },

  validate(value) {
    requireField(value.apiKey, 'apiKey');
    // Throw CredentialsValidationError (field-level 422) if invalid.
  },

  async verify(value) {
    // Optional: make a real API call to confirm credentials work.
    // Return { ok: true } if confirmed; { ok: false, message } on failure.
    return { ok: true, message: 'Credentials verified.' };
  },
};
```

Register the contract in `ProviderCredentialsService.getContractForProvider()` so the generic credential UI can normalize and validate it.

**Step 3 — Provider adapter**

Create `src/{channel}/providers/{provider}/{provider}.provider.ts`:

```typescript
@Injectable()
export class NewProviderAdapter implements IChannelNameProvider, IChannelNameListProvider {
  readonly providerKey   = 'newprovider';
  readonly displayName   = 'New Provider';
  readonly description   = '...';
  readonly supportsListing = true as const;

  getCapabilities(): ChannelNameProviderCapabilities {
    return {
      capabilities: {
        [ChannelNameCapability.ResourceListing]: ChannelNameCapabilityStatus.Available,
        // All other capabilities declared honestly.
      },
    };
  }

  getMetadata() { return { ... }; }

  async listResources(ctx, params) {
    const client = createNewProviderClient(ctx.credentials);
    // Call provider API, map to canonical contracts.
  }
}
```

**Step 4 — Register in the channel module**

```typescript
@Module({
  providers: [
    // ...existing providers
    NewProviderAdapter,
    {
      provide: ChannelNameProviderRegistry,
      useFactory: (...adapters: IChannelNameProvider[]) =>
        new ChannelNameProviderRegistry(adapters),
      inject: [ExistingProviderAdapter, NewProviderAdapter],
    },
  ],
})
export class ChannelNameModule {}
```

That is all. The runtime resolver, credential encryption, company isolation, and CCP ownership are all handled by the platform automatically.

---

## 6. Runtime Resolution

This section documents exactly what happens during the canonical resolution path. Every channel service that resolves a provider goes through these steps.

### Trigger

A channel service calls:

```typescript
const resolved = await this.runtimeResolver.resolveByChannelAndProvider({
  companyId: 'company-id-from-jwt',   // always from the authenticated JWT
  channelKey: 'payment',              // the channel's own key
  providerKey: 'stripe',              // the provider to resolve
});
```

### Step-by-step resolution

```
Step 1: Channel lookup
  → Query Channel collection: { channelKey: 'payment', isActive: true }
  → Throws HTTP 422 if not found or inactive.
  → Output: channelDoc._id

Step 2: Provider lookup (channel-membership verified)
  → Query Provider collection: { providerKey: 'stripe', channelIds: channelId, isActive: true }
  → The channelIds filter verifies the provider is registered for this channel.
  → Throws HTTP 422 if provider is unknown or not in this channel.
  → Output: providerDoc._id, connectionType

Step 3: CCP lookup (company isolation + channel isolation)
  → Query CompanyChannelProvider: { companyId, providerId, channelId, isActive: true }
  → All three filters must match. This is the critical isolation step.
  → A provider in two channels (e.g. Xero in Accounting and Billing) has
    separate CCP records — the channelId filter ensures the correct one is used.
  → Throws HTTP 422 if no CCP exists (provider not enabled for this company).
  → Output: ccpDoc._id

Step 4: Credential lookup
  → Query ProviderCredentials: { companyChannelProviderId: ccpId, isActive: true }
  → Ordered by updatedAt DESC to prefer the most recently updated credential.
  → Throws HTTP 422 if no active credential exists.
  → Output: credDoc._id, encrypted blob

Step 5: Decryption (in-memory only)
  → CryptoService.decryptJson(credDoc.encrypted) using AES-256-GCM.
  → Decrypted object exists only in memory for the current request lifecycle.
  → Never persisted. Never logged. Never returned to callers.
  → Output: credentials object

Step 6: Return ChannelsRuntimeResolved
  → All fields populated. No partial returns.
  → channelKey, channelId, providerKey, providerId, connectionType,
    companyChannelProviderId, providerCredentialsId, tag, isActive,
    credentialsIsActive, credentials
```

### What the channel service does with the resolved context

```typescript
// The resolver returns the runtime context.
const resolved = await this.runtimeResolver.resolveByChannelAndProvider({...});

// The channel resolver service looks up the adapter by providerKey.
const adapter = this.registry.resolve(resolved.providerKey);

// The channel service calls the adapter with the decrypted credentials.
// The adapter never receives the resolver output directly — only the
// business-specific context derived from it.
const result = await adapter.listResources(context, params);
```

---

## 7. What Channels Must Never Do

The following patterns are architectural violations. They introduce hidden coupling, break company isolation, and create bugs when providers are registered in multiple channels.

**❌ Query ProviderCredentials directly in a channel service**

```typescript
// WRONG
const creds = await this.credModel.findOne({ ... });
```

Always use `ChannelsRuntimeResolverService`. It enforces company isolation and decrypts correctly.

**❌ Query CompanyChannelProvider without a channelId filter**

```typescript
// WRONG — finds any CCP for the provider, regardless of channel
const ccp = await this.ccpModel.findOne({ companyId, providerId });

// CORRECT — channel isolation enforced
const ccp = await this.ccpModel.findOne({ companyId, providerId, channelId });
```

Without the channelId filter, a multi-channel provider (e.g. Xero in Accounting and Billing) may return the wrong CCP and therefore the wrong credential set.

**❌ Duplicate runtime resolution logic**

```typescript
// WRONG — duplicates what ChannelsRuntimeResolverService already does
async myResolve(companyId, providerKey) {
  const provider = await this.providerModel.findOne({ providerKey });
  const ccp = await this.ccpModel.findOne({ companyId, providerId: provider._id });
  const cred = await this.credModel.findOne({ companyChannelProviderId: ccp._id });
  const decrypted = this.crypto.decryptJson(cred.encrypted);
  return decrypted;
}
```

Call `resolveByChannelAndProvider`. This service exists to be the one place where resolution happens.

**❌ Decrypt credentials manually in a controller**

Controllers receive business results from services. They never touch credential records or the crypto service. Decryption belongs entirely within the runtime resolver.

**❌ Share a provider adapter across channels**

Xero for Accounting is `XeroAccountingAdapter`. Xero for Billing is `XeroBillingAdapter`. Even if they share helper functions, they are registered in separate channel modules and implement separate channel interfaces. The business operations for accounting (contacts, chart of accounts) are different from billing (invoices, credit notes).

**❌ Hardcode channel names in provider adapters**

A provider adapter must not know which channel it belongs to. It receives a credential context and calls an API. The channel owns that knowledge.

**❌ Return provider-native types from controllers**

Controllers return canonical contracts. Provider-native response types (CoinGate order shapes, Xero invoice responses, Stripe payment intent objects) must be mapped to canonical types before leaving the adapter.

**❌ Import between channel modules**

The Payments module must not import from the Accounting module. The Accounting module must not import from the Billing module. Channels are independent business domains. If two channels need a shared concept, it belongs in the platform infrastructure, not in either channel.

---

## 8. Future Channel Examples

### Storage

A future Storage channel consolidating cloud object storage behind a canonical API:

```
src/storage/
├── storage.module.ts
├── enums/
│   └── storage-capability.enum.ts       (Upload, Download, Delete, List, etc.)
├── interfaces/
│   └── storage-provider.interface.ts    (IStorageProvider, IStorageUploadProvider, etc.)
├── contracts/
│   └── storage-object.contract.ts
├── services/
│   ├── storage-resolver.service.ts      (delegates to resolveByChannelAndProvider)
│   └── storage.service.ts
├── controllers/
│   └── storage.controller.ts
└── providers/
    ├── aws-s3/
    │   ├── aws-s3.capabilities.ts
    │   ├── aws-s3.credentials.contract.ts
    │   └── aws-s3.provider.ts
    └── azure-blob/
        ├── azure-blob.capabilities.ts
        ├── azure-blob.credentials.contract.ts
        └── azure-blob.provider.ts
```

The channel catalogue would register `channelKey: 'storage'`. Each provider would be seeded with `channelIds: [storageChannelId]`. The runtime resolver handles all credential resolution automatically — no changes to `ChannelsRuntimeResolverService` required.

### Notifications

A future Notifications channel unifying push notifications across providers:

```
src/notifications-push/
├── notifications-push.module.ts
├── enums/
│   └── notifications-push-capability.enum.ts   (Send, Template, BatchSend, etc.)
├── interfaces/
│   └── push-provider.interface.ts
├── contracts/
│   └── push-notification.contract.ts
├── services/
│   ├── push-resolver.service.ts
│   └── push.service.ts
├── controllers/
│   └── push.controller.ts
└── providers/
    ├── firebase-fcm/
    │   ├── fcm.capabilities.ts
    │   ├── fcm.credentials.contract.ts
    │   └── fcm.provider.ts
    └── apns/
        ├── apns.capabilities.ts
        ├── apns.credentials.contract.ts
        └── apns.provider.ts
```

Again: catalogue entry, credential contracts, adapters, module registration. The runtime resolver, company isolation, and credential encryption work out of the box.

---

## 9. Adding a New Provider to an Existing Channel

This section shows the minimum work required to add a new provider. No shared infrastructure changes are needed.

### Example: QuickBooks for Accounting

QuickBooks is a competing accounting platform with OAuth 2.0 authentication.

**Files to create:**

```
src/accounting/providers/quickbooks/
├── quickbooks.capabilities.ts
├── quickbooks.credentials.contract.ts    (OAuth: clientId, clientSecret, tokens, realmId)
├── quickbooks.oauth.service.ts           (OAuth lifecycle: start, callback, refresh, revoke)
├── quickbooks.oauth.controller.ts        (routes: /accounting/oauth/quickbooks/*)
├── quickbooks.oauth.types.ts             (QuickBooks-specific API response types)
└── quickbooks-accounting.capabilities.ts (which AccountingCapabilities are available)
```

**What does NOT change:**

- `ChannelsRuntimeResolverService` — no modifications.
- `ProviderCredentials` schema — no modifications.
- `CompanyChannelProvider` schema — no modifications.
- `AccountingModule` infrastructure — add `QuickBooksOAuthController` and related providers only.
- Any Xero file — Xero remains independent.

**Catalogue entry:**

```typescript
{
  providerKey:    'quickbooks',
  displayName:    'QuickBooks',
  description:    'Intuit QuickBooks Online — accounting via OAuth 2.0',
  channelIds:     [accountingChannel._id],
  connectionType: 'oauth',
  isActive:       true,
}
```

The platform resolves QuickBooks credentials automatically from that point.

### Example: PayPal for Payments

```
src/payments/providers/paypal/
├── paypal.capabilities.ts
├── paypal.credentials.contract.ts    (clientId, clientSecret, mode)
├── paypal.provider.ts                (implements IPaymentProvider)
├── paypal.orders.ts                  (order listing and detail)
└── paypal.types.ts                   (PayPal-native response types)
```

Register `PaypalPaymentProvider` in `PaymentsModule`. The `PaymentProviderRegistry` automatically includes it. No other service changes.

---

## 10. The Golden Rule

```
The Channel owns the business.
The Runtime owns the infrastructure.
The Provider owns the external implementation.
```

**What this means in practice:**

A channel says: *"I need a list of paid transactions."*
The runtime says: *"Here are the credentials for the company's active Stripe connection on the Payment channel."*
The provider says: *"Here is the data from the Stripe API, mapped to your canonical PaymentSummary contract."*

None of these three roles is interchangeable. A channel does not call Stripe directly. A provider does not resolve company credentials. The runtime does not know what a payment is.

This separation is what makes it possible to add PayPal, Square, or Wise to the Payment channel without touching the channel business logic; to add MYOB or Sage to the Accounting channel without touching the runtime resolver; and to build an entirely new channel (IoT, VoIP, Document Signing) without modifying any existing channel.

---

*Document version: 1.0 — established August 2026.*
*Reflects the implementation as of the canonical resolution refactor in `ChannelsRuntimeResolverService`.*
*Source of truth: `src/communication/channels/runtime/channels-runtime-resolver.service.ts`.*
