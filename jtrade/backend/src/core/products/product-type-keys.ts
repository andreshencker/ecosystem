/**
 * Canonical TypeProduct.key values the codebase is allowed to branch on.
 * Keep this list minimal (see the "no `if (type.key === 'signals')` scattered
 * everywhere" rule) — today only Signal needs a cross-module key check:
 * indicator/param resolution in ProductsService, and the Alert Setup
 * commercial-readiness rule in product-onboarding. Never branch on
 * TypeProduct.name or a hardcoded id.
 *
 * Deliberately dependency-free (no Mongoose imports) so any module — including
 * ones that must stay light for unit tests — can import just this constant.
 */
export const SIGNALS_TYPE_KEY = 'signals';
