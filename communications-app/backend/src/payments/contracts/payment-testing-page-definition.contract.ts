// src/payments/contracts/payment-testing-page-definition.contract.ts
//
// Canonical page-definition contract for the Payment Testing page.
//
// The contract is the single source of truth for what the generic frontend
// renders: the test form fields, submit label, result presentation type,
// and instructions.
//
// Security rules:
//   - Never include API tokens, secret keys, decrypted credentials, or raw
//     provider headers anywhere in this contract.
//   - Never include provider-supplied HTML, executable expressions, or
//     arbitrary React components.
//   - Only canonical, controlled configuration structures are allowed.

import type { CapabilityStatus } from '../enums/payment.enums';
import { CapabilityStatus as CS } from '../enums/payment.enums';
import {
  computeConnectionCapabilities,
  intersectCapabilities,
} from './payments-page-definition.contract';

// Re-export so callers can import from one place
export { computeConnectionCapabilities, intersectCapabilities };

// ─── Field definition ─────────────────────────────────────────────────────────

export type PaymentTestingFieldType =
  | 'scenario'
  | 'amount'
  | 'payment_unit'
  | 'text'
  | 'email'
  | 'select';

export type PaymentTestingFieldOptionsSource =
  | 'test_scenarios'
  | 'payment_units'
  | 'provider';

import type { PaymentReferenceDataSource } from './payment-reference-data.contract';

export interface PaymentTestingFieldDefinition {
  /** Unique stable key within the form. */
  key: string;
  /** Human-readable field label. */
  label: string;
  /** Input type determines the control rendered by the generic frontend. */
  type: PaymentTestingFieldType;
  /** Whether the field must be filled before submission. */
  required: boolean;
  /**
   * If set, the field is only rendered when this capability is 'available'.
   * Fields without a capability guard are always rendered.
   */
  capability?: string;
  /**
   * Where to fetch select options.
   *   test_scenarios: provider test scenarios from /payments/testing/scenarios
   *   payment_units:  provider payment units from /payment-units (legacy)
   *   provider:       payment method configurations for the connection
   *
   * Prefer referenceDataSource for new fields — it uses a semantically precise
   * controlled vocabulary instead of the generic payment_units source.
   *
   * @deprecated For new fields use referenceDataSource instead of 'payment_units'.
   */
  optionsSource?: PaymentTestingFieldOptionsSource;
  /**
   * Canonical reference-data source for this field's options.
   *
   * When present, the frontend calls:
   *   GET /payments/connections/:connectionId/reference-data/:referenceDataSource
   *
   * This supersedes optionsSource for any field that needs provider-backed
   * data with a precise semantic (price_currencies vs receive_currencies vs
   * payment_assets etc.).
   *
   * The provider adapter returns exactly the dataset appropriate for the source.
   * The generic frontend must not filter or derive one source from another.
   */
  referenceDataSource?: PaymentReferenceDataSource;
  placeholder?: string;
  helpText?: string;
  /** Default value — used to pre-populate the field. */
  defaultValue?: string | number;
  /**
   * When true, the field value must be sent inside providerExtensions[key]
   * rather than as a top-level canonical field.
   * Never use this to pass credentials or secrets.
   */
  providerExtension?: boolean;
}

// ─── Form definition ──────────────────────────────────────────────────────────

export interface PaymentTestingFormDefinition {
  /** Whether the provider supports payment testing at all. */
  supported: boolean;
  /** Form / card title. */
  title: string;
  /** Optional subtitle / helper shown below the title. */
  description?: string;
  /** Submit button label. */
  submitLabel: string;
  /** Ordered list of form fields to render. */
  fields: PaymentTestingFieldDefinition[];
}

// ─── Result presentation definition ──────────────────────────────────────────

export interface PaymentTestingResultDefinition {
  /**
   * How the result is presented after a test is run.
   *   redirect:  the result includes a paymentUrl that must be opened
   *   embedded:  the result is shown inline (future)
   *   none:      no provider-side action is needed after the result
   */
  presentationType: 'redirect' | 'embedded' | 'none';
  /** Title shown in the result panel. */
  successTitle?: string;
  /** Description shown in the result panel. */
  successDescription?: string;
}

// ─── Page definition ──────────────────────────────────────────────────────────

export interface PaymentTestingPageDefinition {
  /** Stable provider key from the adapter. */
  providerKey: string;
  /** ProviderCredentials._id of the selected connection. */
  connectionId: string;
  /** Detected environment for this connection. */
  environment: 'test' | 'live' | 'unknown';
  /** Semantic version of this definition schema. */
  version: string;
  /**
   * Effective capabilities after intersecting provider-level and
   * connection-level capability maps.
   */
  capabilities: Partial<Record<string, CapabilityStatus>>;
  /** The test form configuration. */
  form: PaymentTestingFormDefinition;
  /** How the result is presented after a test run. */
  result: PaymentTestingResultDefinition;
  /** Optional provider-specific instructions shown above the form. */
  instructions?: string[];
  /** Optional known limitations for this provider in test mode. */
  limitations?: string[];
  /** Provider-supplied safe metadata (no credentials). */
  metadata?: Record<string, unknown>;
}

// ─── Definition-resolution context ───────────────────────────────────────────

export interface PaymentTestingPageDefinitionContext {
  companyId: string;
  /** ProviderCredentials._id of the connection being rendered. */
  providerCredentialId: string;
  providerKey: string;
  /** Derived from the stored credential mode field — never from the URL. */
  environment: 'test' | 'live' | null;
  /** Raw provider-level capabilities from the adapter. */
  providerCapabilities: Partial<Record<string, CapabilityStatus>>;
  /**
   * Connection-specific capability overrides (may restrict provider-level
   * capabilities based on account permissions, environment, etc.).
   */
  connectionCapabilities: Partial<Record<string, CapabilityStatus>>;
  /**
   * Effective (intersected) capabilities.
   */
  effectiveCapabilities: Partial<Record<string, CapabilityStatus>>;
}

// ─── Definition component filtering ──────────────────────────────────────────

/**
 * Removes form fields whose capability is not 'available'.
 *
 * Testing page components are binary: present when available, absent when not.
 * There is no 'not_supported' placeholder behaviour — components simply are
 * not rendered when their required capability is unavailable.
 */
export function filterTestingDefinitionComponents(
  definition: PaymentTestingPageDefinition,
  effectiveCapabilities: Partial<Record<string, CapabilityStatus>>,
): PaymentTestingPageDefinition {
  const isAvailable = (cap?: string): boolean =>
    !cap || effectiveCapabilities[cap] === CS.Available;

  return {
    ...definition,
    form: {
      ...definition.form,
      fields: definition.form.fields.filter((f) => isAvailable(f.capability)),
    },
  };
}

// ─── Generic default definition ───────────────────────────────────────────────

/**
 * Builds a provider-neutral Payment Testing page definition for providers that
 * support payment testing but have not implemented a custom definition.
 *
 * This default is intentionally conservative: only the most universally
 * supported form fields are included.
 */
export function buildGenericTestingPageDefinition(
  providerKey: string,
  connectionId: string,
  environment: 'test' | 'live' | null,
  effectiveCapabilities: Partial<Record<string, CapabilityStatus>>,
): PaymentTestingPageDefinition {
  return {
    providerKey,
    connectionId,
    environment: environment ?? 'unknown',
    version: '1.0',
    capabilities: effectiveCapabilities,
    form: {
      supported: true,
      title: 'Run a payment test',
      submitLabel: 'Run payment test',
      fields: [
        {
          key: 'scenario',
          label: 'Scenario',
          type: 'scenario',
          required: true,
          optionsSource: 'test_scenarios',
        },
        {
          key: 'amount',
          label: 'Amount',
          type: 'amount',
          required: true,
          defaultValue: 10,
        },
        {
          key: 'currency',
          label: 'Currency',
          type: 'payment_unit',
          required: true,
          optionsSource: 'payment_units',
        },
        {
          key: 'description',
          label: 'Description (optional)',
          type: 'text',
          required: false,
          placeholder: 'Test payment description',
        },
      ],
    },
    result: {
      presentationType: 'none',
    },
  };
}
