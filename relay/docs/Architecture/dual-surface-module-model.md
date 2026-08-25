# Dual-Surface Module Model

| Field | Value |
|---|---|
| Status | **Approved** |
| Last Updated | 2026-06-16 |
| Governs | All modules in `communications-front` and `communications-backend` |
| Depends on | DEC-004 Amendment A2 (Role Model) |

---

## 1. Principle

Every module that exposes data to users defines **two surfaces**:

### Surface 1 — Company-Scoped Business View

| Attribute | Value |
|---|---|
| Roles | `company_owner`, `company_admin`, `operator`, `viewer` |
| Scope | `company` — data filtered by `authContext.companyId` |
| Purpose | Daily business operation, configuration, monitoring |
| Navigation | Sidebar sections: My Company, Users, Notifications, Reports & Files |
| Backend filter | `WHERE companyId = authContext.companyId` on every query |

### Surface 2 — Platform-Admin Support / Admin View

| Attribute | Value |
|---|---|
| Role | `platform_admin` only |
| Scope | `global` — no companyId filter applied |
| Purpose | Platform management, cross-company support, audit, monitoring |
| Navigation | Sidebar sections: Platform Management, Support / Operations |
| Backend filter | None — all companies visible |

**platform_admin does not operate as a company user.** There is no hybrid view where a platform admin acts within a company context through the sidebar. Direct URL access to company-scoped routes is permitted for support investigation only.

---

## 2. Platform Admin Sidebar Structure

```
Overview
  ▪ Dashboard

Platform Management        ← SECTION A
  ▪ Companies              manages all companies
  ▪ Platform Admins        manages platform admin accounts
  ▪ Channels               manages global channel catalogue
  ▪ Providers              manages global provider catalogue
  ▪ Global Templates       manages platform-level templates

Support / Operations       ← SECTION B
  ▪ Global Users           all users across all companies
  ▪ Audit Logs             full audit trail, all companies
  ▪ Failed Notifications   cross-company delivery failures
  ▪ API Usage              API key usage, rate limits, quotas
  ▪ Company Activity       per-company activity summaries
  ▪ Error Logs             system-wide error monitoring

Settings
  ▪ Profile
```

---

## 3. Company-Scoped Role Sidebar Structure

```
Overview
  ▪ Dashboard

My Company                 ← company data, scoped to their companyId
  ▪ My Company             company identity and settings
  ▪ Channel Providers      company's channel provider assignments
  ▪ Credentials            company's provider credentials
  ▪ Templates              company's layout templates
  ▪ Domain Catalogue       company's domain catalogue
  ▪ Event Catalogue        company's event catalogue

Users
  ▪ Team                   users and pending invitations (company-scoped)

Notifications
  ▪ Test Notifications     send test notifications (company-scoped)

Reports & Files
  ▪ Reports
  ▪ Media
  ▪ Storage

Settings
  ▪ Profile
```

---

## 4. Module Surface Definitions

Each module below declares its two surfaces. This table is the authoritative reference before any module implementation begins.

### 4.1 Users / Team

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | `/users` | owner, admin | own company users + invitations | Team | Implemented |
| Support | `/users` | platform_admin | all users, all companies | Global Users | Implemented (same page, different data scope) |

**Dual-surface note:** The `/users` page detects scope from the JWT (`companyId = null` → global view, `companyId ≠ null` → company view). One page, two data scopes.

---

### 4.2 Companies

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | `/company` | owner, admin | own company only | My Company | Implemented (identity display; full settings Coming Soon) |
| Support | `/companies` | platform_admin | all companies | Companies | Implemented (Sprint-003 CRUD) |

---

### 4.3 Templates

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | `/layout-templates` | owner, admin | company-scoped templates | Templates | Coming Soon |
| Support | `/global-templates` | platform_admin | platform-level global templates | Global Templates | Coming Soon |

---

### 4.4 Channels

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | `/company-channel-providers` | owner, admin | company's provider assignments | Channel Providers | Coming Soon |
| Support | `/channels` | platform_admin | global channel catalogue | Channels | Coming Soon |

---

### 4.5 Providers

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | `/provider-credentials` | owner, admin | company's credentials | Credentials | Coming Soon |
| Support | `/providers` | platform_admin | global provider catalogue | Providers | Coming Soon |

---

### 4.6 Audit Logs

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | — | — | (not exposed to company roles) | — | Not applicable |
| Support | `/audit-logs` | platform_admin | all companies | Audit Logs | Coming Soon |

---

### 4.7 Notifications

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | `/notifications/test` | owner, admin, operator | own company | Test Notifications | Coming Soon |
| Support | `/support/failed-notifications` | platform_admin | all companies | Failed Notifications | Coming Soon |

---

### 4.8 Reports / Files

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | `/files/reports` | owner, admin, operator, viewer | own company | Reports | Coming Soon |
| Business | `/files/media` | owner, admin, operator, viewer | own company | Media | Coming Soon |
| Business | `/files/storage` | owner, admin, operator | own company | Storage | Coming Soon |
| Support | `/support/api-usage` | platform_admin | all companies | API Usage | Coming Soon |
| Support | `/support/company-activity` | platform_admin | all companies | Company Activity | Coming Soon |
| Support | `/support/error-logs` | platform_admin | all companies | Error Logs | Coming Soon |

---

### 4.9 Domain & Event Catalogue

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | `/domain-catalogue` | owner, admin | own company | Domain Catalogue | Coming Soon |
| Business | `/event-catalogue` | owner, admin | own company | Event Catalogue | Coming Soon |
| Support | — | — | (accessed via Companies > detail view) | — | Not a separate surface |

---

### 4.10 Platform Admins

| Surface | Route | Role(s) | Data scope | Label | Status |
|---|---|---|---|---|---|
| Business | — | — | (not applicable to company roles) | — | Not applicable |
| Support | `/platform-admins` | platform_admin | platform admin accounts only | Platform Admins | Coming Soon |

---

## 5. Implementation Rules

1. **Before implementing any module**, add its surface definitions to §4 of this document.
2. **Backend:** every endpoint that serves company-scoped data must apply `WHERE companyId = authContext.companyId` when `authContext.scope === 'company'`. platform_admin (scope `global`) receives no filter.
3. **Frontend:** no module page may contain `if (role === 'platform_admin')` logic for data filtering. Filtering is determined by the JWT's `companyId` field only.
4. **route-rules.ts:** company-scoped routes must not appear in `platform_admin.allowedRoutes`. Support routes must not appear in company role routes.
5. **role-config.ts:** sidebar items must only link to routes present in the role's `allowedRoutes`.
6. **No hybrid views:** platform_admin never sees a company's business view. Company roles never see the global admin view.

---

## 6. Route Ownership Table

| Route | Owner | Surface | Status |
|---|---|---|---|
| `/dashboard` | all | universal | Implemented |
| `/companies` | platform_admin | Platform Management | Implemented |
| `/company` | owner, admin | Business | Implemented (partial) |
| `/platform-admins` | platform_admin | Platform Management | Coming Soon |
| `/channels` | platform_admin | Platform Management | Coming Soon |
| `/providers` | platform_admin | Platform Management | Coming Soon |
| `/global-templates` | platform_admin | Platform Management | Coming Soon |
| `/users` | owner, admin, platform_admin | Business + Support | Implemented |
| `/audit-logs` | platform_admin | Support | Coming Soon |
| `/support/failed-notifications` | platform_admin | Support | Coming Soon |
| `/support/api-usage` | platform_admin | Support | Coming Soon |
| `/support/company-activity` | platform_admin | Support | Coming Soon |
| `/support/error-logs` | platform_admin | Support | Coming Soon |
| `/company-channel-providers` | owner, admin | Business | Coming Soon |
| `/provider-credentials` | owner, admin | Business | Coming Soon |
| `/layout-templates` | owner, admin | Business | Coming Soon |
| `/domain-catalogue` | owner, admin | Business | Coming Soon |
| `/event-catalogue` | owner, admin | Business | Coming Soon |
| `/notifications/test` | owner, admin, operator | Business | Coming Soon |
| `/files/reports` | owner, admin, operator, viewer | Business | Coming Soon |
| `/files/media` | owner, admin, operator, viewer | Business | Coming Soon |
| `/files/storage` | owner, admin, operator | Business | Coming Soon |
| `/settings/profile` | all | universal | Coming Soon |
