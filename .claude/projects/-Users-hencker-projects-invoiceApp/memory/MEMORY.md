# Project Memory

- [Project structure](project_structure.md) — repo layout, service names, key paths
- [Phase A completion](project_phase_a.md) — Phase A Foundation completed 2026-06-14, what's next
- [Responsive UI standard](ui_responsive_standard.md) — every page needs desktop DataGrid + mobile card layout; declared 2026-06-22
- [Docs governance](docs_governance.md) — docs/ is canonical; update docs + ADR/DEC on every architectural change; declared 2026-06-23
- [DEC-016 Navigation](project_dec016_navigation.md) — sidebar follows config workflow order; Business App and Platform Admin canonical structures; mandatory future module gate
- [DEC-017 Provisioning](project_dec017_provisioning.md) — notification composition model (Theme+Company+Layout+Event), company provisioning lifecycle, default domains/events, rendering flow, idempotency rules
- [DEC-019 Trigger Flow](project_dec019_trigger_flow.md) — single NotificationService.notifyEvent() for all triggers; companyId always resolved server-side; external apps use x-integration-token; canonical domainKey.eventKey format
- [Multi Revenue Source Architecture](project_multi_revenue_source.md) — ADR-009 accepted 2026-07-06; ERP is financial platform; Calendar is transversal; 12 doc contradictions with correction list
- [Revenue Flow Architecture](project_revenue_flow.md) — ADR-010 accepted 2026-07-06; Revenue Flow is first-class concept; Revenue Source=category, Revenue Flow=pipeline; Revenue Flow Contract is the invariant interface to Revenue Domain
- [Engineering Organization](project_engineering_org.md) — 12 departments, 17 agents, CTO Agent as orchestrator, 15+ sprint roadmap; docs/engineering/ is canonical; implementation phase begins
- [Sprint 0.5 Shared Foundation](project_sprint_0_5.md) — DDD shared kernel built 2026-07-06; src/shared/ in business-app/backend; all Sprint 1 modules extend from here; ADR-011–018
- [Communication Architecture](project_communication_architecture.md) — Seed Catalog (ADR-019), Platform vs Business token flows, provisioning on token-save not company-create, DoD §9; declared 2026-07-07
- [Sprint 3 Calendar Domain](project_sprint3_calendar.md) — Calendar Domain implemented 2026-07-07; Sprint 2 GO confirmed; CalendarSource/Event/ScheduledEvent schemas; 6 Domain Events; iCal sync; Sprint 4 (Work) depends on this
- [Integrations Architecture](project_integrations_architecture.md) — ADR-020 accepted 2026-07-07; src/integrations/ replaces src/settings/; migration map defined; docs/integrations/README.md is entry point
