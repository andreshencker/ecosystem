---
tags: [architecture, planned]
status: planned
---

# Future Platform Architecture

These services do not exist in the codebase. They are planning notes only. No implementation detail is documented here.

---

## Communication Frontend

**Purpose:** A web dashboard for platform operators and company administrators to manage their communication configuration without using the API directly.

**Planned capabilities:**
- Company onboarding
- Provider credential management (add, rotate, delete)
- Template builder (create and edit layout templates)
- Domain and event catalogue management
- Notification history and delivery logs

**Depends on:** Communication Backend (stable, documented API)

**Status:** No framework chosen. No timeline set.

---

## Invoice Service

**Purpose:** Core invoicing functionality — create, manage, and deliver invoices.

**Planned capabilities:**
- Invoice creation and management
- Invoice delivery via the Communication Backend (PDF generation + email)
- Payment status tracking
- Customer management

**Depends on:** Communication Backend (for notification delivery and file generation)

**Status:** Planned. No design started.

---

## Reporting Service

**Purpose:** Cross-service analytics and reporting.

**Planned capabilities:**
- Usage reports across tenants
- Notification delivery metrics
- Invoice and payment summaries
- XLSX / CSV exports

**Depends on:** Communication Backend, Invoice Service

**Status:** Planned. No design started.

---

## Billing Service

**Purpose:** Subscription and billing management for platform tenants.

**Planned capabilities:**
- Subscription plans and tier management
- Usage-based billing
- Invoice generation for platform fees
- Payment gateway integration

**Depends on:** Invoice Service, Reporting Service

**Status:** Planned. No design started.

---

## API Gateway

**Purpose:** A single entry point for all client traffic. Sits in front of all services.

**Planned capabilities:**
- Request routing to downstream services
- Edge authentication (validate tokens before traffic hits services)
- Rate limiting and throttling per tenant
- API versioning
- Load balancing

**When to build:** When two or more services exist and need a unified entry point. Building it before that point adds complexity with no benefit.

**Status:** Planned. Deferred until at least one additional service is in production.

---

## Related

- [[Global Architecture]] — current state and overall design
- [[Roadmap]] — phase breakdown and sequencing
