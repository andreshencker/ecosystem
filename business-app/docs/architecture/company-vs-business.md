# Company vs Business — Relación entre bounded contexts

**Fecha:** 2026-07-06  
**Estado:** Decisión arquitectural establecida

---

## Pregunta que responde este documento

El codebase tiene dos entidades que parecen representar la misma cosa:

| Entidad | Path | Descripción |
|---|---|---|
| `Company` | `src/platform/company/` | Schema Mongoose simple |
| `Business` | `src/business/` | Aggregate DDD con CQRS |

**¿Son lo mismo? ¿Hay duplicidad? ¿Cuál es canónica?**

---

## Respuesta: son dos bounded contexts del mismo tenant

No son duplicados. Son dos proyecciones del mismo tenant real, en capas distintas:

```
Tenant (empresa real del mundo)
        │
        ├── Platform layer     →  Company   (src/platform/company/)
        │   Identidad SaaS.       Gestiona: auth, users, SMTP, fiscal profile.
        │   La crea auth.service.  companyId es el TenantId de toda la plataforma.
        │
        └── ERP domain layer   →  Business  (src/business/)
            Lógica de negocio.    Gestiona: tipo de empresa, configuraciones ERP,
            La usa el roadmap.    reglas de provisioning, eventos de dominio.
```

---

## Reglas de identidad

- El `companyId` que vive en el JWT, en `UsersService`, en `AuthContext`, y en todos los schemas del ERP **es el ObjectId de `Company`** (colección `companies`).
- El `Business` aggregate usa ese mismo id como su `tenantId`.
- No hay una FK directa hoy (Sprint 1). En Sprint 5+ el `Business` tendrá una referencia explícita al `companyId` del platform layer.

---

## Cuándo usar cada uno

| Caso de uso | Usar |
|---|---|
| Auth, users, SMTP, fiscal profile | `CompanyPortalService` / `Company` schema |
| Lógica de negocio ERP (rates, invoices, contracts) | `Business` aggregate |
| JWT / RBAC / tenant isolation | Siempre `companyId` del platform layer |
| Eventos de dominio del ERP | `Business` aggregate → emite `BusinessCreatedEvent` etc. |

---

## Estado actual (Sprint 1)

- `Company` es la entidad activa: creada en `register()`, usada en auth y usuarios.
- `Business` aggregate existe pero **no está conectado a `Company`** todavía. El `BusinessController` crea `Business` independientemente.
- Esta desconexión es temporal. En Sprint 5 (Revenue Domain) `Business` deberá referenciar `companyId`.

## Plan de integración futura

1. **Sprint 2**: `Business.tenantId` se mapea al `companyId` del platform layer.
2. **Sprint 5+**: Provisioning activa el `Business` aggregate automáticamente al registrar una empresa.
3. **No eliminar `Company`**: es la raíz de identidad SaaS y nunca será reemplazada por `Business`.

---

## Lo que NO hacer

- ❌ No unificar `Company` y `Business` en una sola entidad — tienen responsabilidades distintas.
- ❌ No usar `Business` aggregate para decisiones de auth o RBAC.
- ❌ No crear un tercer concepto "tenant" o "organization" — `Company.companyId` ya cumple esa función.
