# Evento: identity.user_registered

**Versión del contrato:** 1
**Fecha:** 2026-07-06
**Productor:** Platform/Identity domain (`src/platform/auth/`)
**Estado:** Oficial — implementado (Sprint 1)

---

## Propósito

Indica que un nuevo usuario fue registrado en el sistema. Dispara la creación del Business y alimenta `dim_user` en BI.

---

## Payload

| Campo | Tipo | Requerido | BI Column | Descripción |
|---|---|---|---|---|
| `userId` | UUID | ✅ | `dim_user.user_id` | ID del usuario |
| `businessId` | UUID | ✅ | `dim_user.business_id` | Business al que pertenece |
| `email` | string | ✅ | `dim_user.email` | Email (ya verificado al registrar) |
| `firstName` | string | ✅ | `dim_user.first_name` | Nombre |
| `lastName` | string | ✅ | `dim_user.last_name` | Apellido |
| `role` | string | ✅ | `dim_user.role` | `business_owner \| admin \| staff \| etc.` |
| `registeredAt` | ISO8601 | ✅ | `dim_user.created_at` | Timestamp |

---

## BI Relevance

```
Tabla afectada: dim_user
Idempotency: ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()

Nota: Los usuarios invitados (UserInvited + UserActivated) también deben alimentar dim_user.
El evento UserActivated debe hacer UPSERT para actualizar el registro que puede existir
desde UserRegistered.
```

---

## Estado de implementación

- ✅ Evento existe en código (verificar payload exacto)
- ❌ Handler de BI: no implementado (Sprint 11)
