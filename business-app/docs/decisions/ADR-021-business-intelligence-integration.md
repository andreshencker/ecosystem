---
id: ADR-021
title: Business Intelligence Integration — migración de src/settings/bi-client a src/integrations/business-intelligence
status: Accepted
date: 2026-07-08
tags: [architecture, integrations, business-intelligence, migration]
---

# ADR-021 — Business Intelligence Integration

## Status

Accepted — 2026-07-08

---

## Context

El cliente HTTP al Business Intelligence service vivía en `src/settings/bi-client/`. ADR-020 declaró que toda integración con sistemas externos debe vivir en `src/integrations/`. Como parte de aplicar ADR-020 a todas las integraciones existentes, el cliente BI fue migrado.

---

## Decision

`src/integrations/business-intelligence/` es la ubicación canónica del cliente HTTP al BI service.

La migración consistió en:

| Acción | Detalle |
|---|---|
| Crear `business-intelligence.module.ts` | Reemplaza `bi-client.module.ts` |
| Crear `business-intelligence.service.ts` | Reemplaza `bi-client.service.ts`, misma lógica |
| Alias de compatibilidad | `export { BusinessIntelligenceService as BiClientService }` hasta completar la transición |
| Actualizar `analytics/analytics.module.ts` | Import desde nueva ruta |
| Actualizar `analytics/analytics.controller.ts` | Import desde nueva ruta |
| Eliminar `src/settings/bi-client/` | Carpeta legacy removida |
| Eliminar `src/settings/` | Carpeta vacía removida |

---

## Consequences

- El BI client sigue siendo un cliente HTTP sin estado de conexión persistido (no usa MongoDB).
- El patrón es más simple que Communications: solo `service.ts` + `module.ts` + `README.md`.
- Si en el futuro el BI requiere OAuth o estado de conexión, se sigue el patrón de `communications/`.
- `src/settings/` fue eliminada. Si en el futuro se necesitan preferencias de usuario reales, se creará `src/preferences/` o similar con semántica correcta.

---

## Relation to existing documentation

| Document | Relationship |
|---|---|
| `ADR-020-integrations-architecture.md` | Este ADR aplica ADR-020 al cliente BI |
| `docs/integrations/business-intelligence/README.md` | Documentación de la integración |
| `docs/domain/business-intelligence/` | Modelo de dominio del BI (no afectado) |
