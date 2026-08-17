# Ecosystem boundary

This module is Relay's only application-layer boundary with Grapifly.

## Owned here

- Versioned Grapifly contracts.
- Organization identity and profile access.
- Ecosystem users, memberships, invitations, roles and application access.
- Translation from Grapifly contracts to Relay-facing response shapes.

## Not owned here

- User credentials or local authentication.
- Organization identity persistence.
- SMTP, provider credentials, themes, templates, documents, calendars or payments.
- Relay execution and delivery workflows.

Those operational resources remain in their Relay domain modules and are scoped
to the canonical Grapifly organization identifier as the legacy tenant model is
migrated.
