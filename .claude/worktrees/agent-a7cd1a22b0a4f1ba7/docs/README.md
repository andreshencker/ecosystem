# Invoice Platform — Documentation

This folder is the **single canonical source** for all project documentation.

All active documentation is versioned alongside code in this repository.

---

## Structure

| Folder | Contents |
|---|---|
| [Architecture/](Architecture/) | Platform architecture — layers, data models, tech stack, future design |
| [Backend/](Backend/) | Communications Backend — API, database, security, environment, architecture |
| [Frontend/](Frontend/) | Communications Frontend — architecture, auth, routes, state, UX, components |
| [Decisions/](Decisions/) | All platform decisions (DEC-001 through DEC-012) and ADRs (ADR-001 through ADR-006) |
| [Business/](Business/) | Vision, MVP, business rules, customer journey, pricing |
| [Governance/](Governance/) | Definition of done, project lifecycle, roadmap, AI agents |
| [Reference/](Reference/) | Glossary and cross-cutting reference material |
| [Audits/](Audits/) | Historical readiness audits (immutable snapshots) |
| [TechnicalDebt/](TechnicalDebt/) | Open and resolved technical debt items (TD-001 through TD-017) |
| [Sprints/](Sprints/) | Current sprints, backlogs, and historical sprint records |
| [Templates/](Templates/) | Document templates (ADR, DEC, Feature Spec, Meeting Notes) |
| [Archive/](Archive/) | Superseded documents — preserved for historical reference |

---

## Decision Records

See [Decisions/README.md](Decisions/README.md) for the full index of all DEC and ADR records.

**Quick reference:**

| Decision | Title |
|---|---|
| DEC-008 | User, Company and Role Lifecycle (canonical RBAC reference) |
| DEC-009 | Authentication and Registration Lifecycle |
| DEC-010 | Module Ownership and Communication Surfaces |
| DEC-011 | Platform Company Field and Invariants |
| DEC-012 | Platform Communication Resolution Strategy |
| ADR-001 | Dual Navigation Strategy |
| ADR-003 | Top Navigation Simplification |

---

## Key Rules

1. All active documentation lives in this folder. No external wiki, no Obsidian vault.
2. Documentation is updated in the same PR as the code change it describes.
3. To supersede a document, move it to `Archive/` with an archive header and create the replacement.
4. All decisions go into `Decisions/` — no sub-folder decisions.
5. Never delete archived documents. The archive is permanent.

---

Last updated: 2026-06-23 (migration from Obsidian vault)
