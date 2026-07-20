---
tags: [governance, ai-agents]
created: 2026-06-14
status: Active
---

# AI Agents — Governance Registry

This document defines all AI agents authorised to work on the Invoice Platform. It specifies which agents are active, which are planned, and the rules all agents must follow.

All agents are bound by:
- [[Definition of Done]]
- [[Project Lifecycle]]

---

## Active Agents

| Agent | Status | Scope |
|---|---|---|
| [[Agents/architecture-governance-agent\|Architecture Governance Agent]] | Active | Project governance, audits, decisions, cross-service coordination |
| [[Agents/communication-backend-agent\|Communication Backend Agent]] | Active | `communications-backend/` service — NestJS backend |
| [[Agents/communication-frontend-planning-agent\|Communication Frontend Planning Agent]] | Active | Frontend planning, architecture, decisions, sprint prep — no code |
| [[Agents/communication-frontend-agent\|Communication Frontend Agent]] | **Active** | `communications-front/` — Next.js frontend implementation |

---

## Planned Future Agents

The following agents are documented as placeholders only.

**They must not be activated until their service is approved for development.**

| Agent | Status | Prerequisite |
|---|---|---|
| Invoice Service Agent | Planned — not activated | Invoice service approved and scoped |
| Invoice Frontend Agent | Planned — not activated | Invoice backend stable, API contracts defined |
| Billing Service Agent | Planned — not activated | Billing service approved and scoped |
| Reporting Service Agent | Planned — not activated | Reporting service approved and scoped |
| Gateway Agent | Planned — not activated | All upstream services stable |

> **Rule:** A future agent file must not be created until the service enters active development. Premature activation risks work on services that do not yet exist.

---

## Agent Hierarchy

```
Architecture Governance Agent
├── owns: Project/Governance/
├── owns: Audits/
├── owns: Decisions/
└── reviews: all other agents

Communication Backend Agent
├── owns: communications-backend/src/
└── owns: Modules/Communication/Backend/

Communication Frontend Planning Agent  (Active — no code)
├── owns: Modules/Communication/Frontend/  (planning docs)
└── gates: Communication Frontend Agent activation

Communication Frontend Agent  (Active — activated 2026-06-14)
├── owns: communications-front/
└── owns: Modules/Communication/Frontend/
```

---

## Traceability Chain

Every agent must preserve the following chain for all work:

```
Audit
  → Decision
    → Technical Debt
      → Backlog
        → Sprint
          → Implementation
```

No step may be skipped. Every artifact must reference the artifact that generated it.

---

## Activation Rules

### To activate a new agent

1. The service must be in active development (not planned)
2. An audit must exist for the service
3. A backlog and sprint must exist
4. The agent profile must be created in `Project/Governance/Agents/`
5. This registry must be updated

### To deactivate an agent

1. All open sprint items must be closed or transferred
2. Technical debt must be up to date
3. Documentation must be finalised
4. Agent status updated to `Inactive` in this registry and in their profile

---

## Governance Rule

No agent may mark work as completed unless:

- [[Definition of Done]] is fully satisfied
- Documentation is updated
- Traceability chain is maintained

An agent that produces code without documentation has not completed the task.

---

## Related Documents

- [[Definition of Done]]
- [[Project Lifecycle]]
- [[../Project/Roadmap]]
