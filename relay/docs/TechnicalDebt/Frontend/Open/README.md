---
tags: [technical-debt, open, communication, frontend]
---

# Open Technical Debt — Communication Frontend

This folder contains all open (unresolved) technical debt items for the Communication Frontend.

## Naming Convention

```
TD-NNN Description.md
```

Numbers are sequential across the entire Frontend Technical Debt register (Open + Resolved).

## Frontmatter Template

```yaml
---
tags: [technical-debt, open, communication, frontend]
id: TD-NNN
severity: low | medium | high
area: auth | routing | components | api | state | build | testing
introduced-sprint: Sprint-NNN
---
```

## When to Create a Debt Item

- A known limitation is accepted and shipped intentionally
- A component or behaviour deviates from the spec due to a time constraint
- A QA review flags a risk that is not blocking but should be tracked
- A future phase is required to resolve something left incomplete in the current phase

## Closing a Debt Item

1. Resolve the issue in the codebase
2. Move the file from `Open/` to `Resolved/`
3. Add `status: Resolved`, `resolved-date`, and `resolved-sprint` to frontmatter
4. Reference the resolving sprint in the file body

## Current Open Items

No items yet. The first Frontend technical debt items will be logged after the Phase A foundation audit.

## Related

- [[../../Backlog]]
- [[../../Audits/README]]
- [[../Resolved/README]]
