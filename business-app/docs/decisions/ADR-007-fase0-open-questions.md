# ADR-007: Resolución de preguntas abiertas de Fase 0

**Fecha:** 2026-07-05
**Estado:** Aceptado
**Autor:** Architecture Review Session

---

## Propósito

Este ADR cierra las preguntas abiertas marcadas como "Fase 0" en `docs/domain/12-open-questions.md`. Son las decisiones que deben tomarse **antes de iniciar cualquier implementación** porque afectan los fundamentos del sistema.

Ninguna implementación del Business App puede comenzar hasta que este ADR sea aceptado.

---

## Q-001: ¿Se renombra companyId a businessId?

**Decisión: SÍ — migración completa a businessId.**

Documentada en detalle en ADR-001. Se reproduce el resumen aquí:

| Campo | Antes | Después |
|---|---|---|
| `User.companyId` | ObjectId del Business | `User.businessId` |
| `User.companyKey` | Slug del Business | `User.businessKey` |
| `Company.companyKey` | — | `Business.businessKey` |
| `Company.companyName` | — | `Business.businessName` |
| JWT payload | `companyId` | `businessId` |
| AuthContext | `ctx.companyId` | `ctx.businessId` |
| Colección MongoDB | `companies` | `businesses` |

**Por qué:** Las 10 entidades nuevas del dominio usan `businessId`. Si las entidades existentes siguen con `companyId`, el codebase tiene inconsistencia permanente. El costo de la migración ahora es $O(1)$. El costo de no migrar es $O(\infty)$ — crece con cada nueva entidad.

**Estado:** Listo para implementar. Ver ADR-001 para el plan de migración en 4 fases.

---

## Q-002: ¿Un Business puede tener múltiples FiscalProfiles?

**Decisión: No — 1:1 en v1. Un Business, un FiscalProfile.**

### Contexto

La duda era si un Business puede tener múltiples estructuras fiscales (ej. dos ABNs para diferentes líneas de negocio).

### Opciones evaluadas

| Opción | Descripción | Por qué descartada |
|---|---|---|
| A (elegida) | 1:1 — un FiscalProfile por Business | — |
| B | 1:N — un Business puede tener N FiscalProfiles | Ver abajo |

### Análisis de la Opción B

La Opción B (múltiples FiscalProfiles) implicaría:
- Cada Invoice elegiría cuál FiscalProfile usar
- El número de factura necesitaría secuencias separadas por FiscalProfile
- El Chart of Accounts podría necesitar variaciones por FiscalProfile
- Los PostingRules necesitarían saber a qué FiscalProfile pertenece cada transacción
- El onboarding sería más complejo

Para el target de mercado (freelancers, contractors, pequeñas empresas) este nivel de complejidad no está justificado en v1.

### La Opción B en perspectiva

Un negocio con dos ABNs y dos estructuras fiscales es, en esencia, dos negocios distintos. La solución correcta para ese caso en la plataforma es **dos Businesses separados** — cada uno con su propio FiscalProfile, sus propias facturas, y sus propios usuarios.

### Regla resultante

```
Invariante: exists exactly one FiscalProfile per Business.
ChartOfAccounts: 1:1 with Business.
InvoiceNumber sequence: 1 per Business.
```

### Extensión futura (si se necesita)

Si en el futuro un Business necesita múltiples perfiles fiscales, el path correcto es:

```
Phase X: Multi-fiscal-profile (si hay evidencia de demanda suficiente):
  FiscalProfile.isDefault: boolean
  Invoice.fiscalProfileId: ObjectId (opcional — si null, usa el default)
```

Esta extensión es compatible con el diseño 1:1 actual: se agrega `isDefault` y un campo opcional en Invoice. No requiere migrar el modelo actual.

---

## Q-003: ¿Un User puede pertenecer a múltiples Businesses?

**Decisión: No en v1 — un User, un Business.**

### Contexto

La duda era si un contador freelance podría gestionar la facturación de 3 clientes desde la misma cuenta de Invoice App.

### Opciones evaluadas

| Opción | Descripción | Impacto |
|---|---|---|
| A (elegida) | Un User por Business. Para múltiples Businesses, crear cuentas separadas. | — |
| B | `user.businessIds[]`. Usuario puede cambiar entre Businesses. | Cambios en JWT, AuthContext, UI |
| C | Modelo "agencia": un Business gestiona otros Businesses. | Complejidad de permisos cross-business |

### Por qué Opción A en v1

**El JWT tiene `businessId` singular.** El cambio a `businessIds[]` requiere:
1. Cambiar el schema del JWT (breaking change para tokens en circulación)
2. Implementar UI de "selección de Business activo" (context switching)
3. Gestionar que el usuario no "filtre" datos del Business A al operar en el Business B
4. Cambiar todas las verificaciones de authContext.businessId

El beneficio en v1 no justifica esta complejidad. Los freelancers que trabajan con un solo negocio son la audiencia primaria.

### Compatibilidad con la extensión futura

Como documentado en ADR-006, la extensión a multi-Business es compatible con el diseño actual:

```
Extensión futura (si se necesita en v2):
  1. user.businessIds: ObjectId[] (agregar campo)
  2. JWT: businessId sigue siendo singular (el Business "activo" en la sesión)
  3. UI: selector de Business al login (si hay más de uno)
  4. Backend: sin cambios estructurales
```

### Caso del contador que gestiona múltiples clientes

En v1, la solución recomendada es:
- El contador crea su cuenta en Invoice App con su propio Business
- Los Businesses de sus clientes le dan acceso con rol `accountant`
- El contador usa la cuenta del cliente para acceder a sus datos

Esto requiere que el cliente lo invite. Es una fricción menor que es aceptable para v1.

---

## Q-014: ¿El schema CompanySmtp queda obsoleto?

**Decisión: Sí — deprecar y eliminar en Fase 0.**

### Contexto

`CompanySmtp` es un schema que almacena credenciales SMTP directas (host, port, user, password). Fue implementado en Sprint 2 como un mecanismo de configuración de email por empresa.

Con la Communications Platform ahora operativa, Business App envía todos los emails a través de `CommunicationConnection` → Communications Platform → proveedor (SendGrid, Mailgun, SMTP, etc.). No hay ninguna ruta de código en producción que use `CompanySmtp` directamente para enviar emails operativos.

### Análisis

| Pregunta | Respuesta |
|---|---|
| ¿Algún código activo usa CompanySmtp para enviar emails? | No — el envío pasa por CommunicationConnection |
| ¿El endpoint PATCH /company/smtp está implementado? | Sí, pero no hay consumer del dato |
| ¿Existe un test que valide el envío por CompanySmtp? | No hay tests de envío directo |
| ¿Hay plans de usar CompanySmtp como fallback? | No — Communications Platform es el único canal |

### Riesgo de mantener CompanySmtp

Mantener `CompanySmtp` crea confusión en el codebase:
- Dos configuraciones de email (CompanySmtp vs CommunicationConnection) con propósitos superpuestos
- Un desarrollador nuevo no sabe cuál usa la aplicación en producción
- El SMTP endpoint activo (`PATCH /company/smtp`) implica que hay funcionalidad real — no la hay

### Decisión: eliminar en Fase 0

```
Scope de la eliminación:
  ❌ Schema: CompanySmtp (src/platform/company/schemas/company-smtp.schema.ts o equivalente)
  ❌ Colección MongoDB: company_smtp (o business_smtp si ya fue migrada)
  ❌ Endpoint: PATCH /company/smtp
  ❌ Endpoint: GET /company/smtp
  ❌ Endpoint: POST /company/smtp/test
  ❌ Service: CompanySmtpService
  ❌ DTO: UpdateSmtpDto
  ❌ Frontend: página /company/smtp

REEMPLAZA CON:
  ✅ CommunicationConnection (ya existe)
  ✅ El Business Owner configura su integración con Communications Platform
     (el proveedor SMTP se configura dentro de Communications Platform, no en Business App)
```

### Por qué no como fallback

La Opción C de la pregunta original sugería mantener CompanySmtp como fallback si no hay CommunicationConnection. **Esto está rechazado** porque:
1. Dos caminos de envío → dos codepaths → doble complejidad de mantenimiento
2. Si CommunicationConnection no está configurado, la respuesta correcta es no enviar y notificar al Business Owner que configure su conexión — no silenciosamente usar un canal diferente
3. Un fallback de email puede enmascarar problemas de configuración de Communications

---

## Resumen de decisiones de Fase 0

| Pregunta | Decisión | Impacto principal |
|---|---|---|
| Q-001: companyId → businessId | ✅ SÍ — migración completa | ADR-001 plan de 4 fases |
| Q-002: ¿Múltiples FiscalProfiles? | ❌ No en v1 — 1:1 | Simplifica InvoiceGenerationService |
| Q-003: ¿User en múltiples Businesses? | ❌ No en v1 — 1:1 | JWT sigue con businessId singular |
| Q-014: ¿CompanySmtp obsoleto? | ✅ SÍ — eliminar en Fase 0 | Menos endpoints, código más claro |

---

## Prerrequisitos para iniciar Fase 1

Antes de crear la primera entidad de Fase 1 (Customer), lo siguiente debe estar completado:

```
Fase 0 Checklist:
  □ ADR-001 Fase 1 ejecutada: Company → Business (schema + colección)
  □ ADR-001 Fase 2 ejecutada: campos renombrados en MongoDB
  □ ADR-001 Fase 3 ejecutada: JWT payload migrado a businessId
  □ CompanySmtp eliminado (endpoints, schema, colección)
  □ AuthContext.types.ts: solo businessId (sin companyId ni organizationId)
  □ Tests de regresión: login, registro, invitaciones, company portal
  □ Frontend actualizado para leer businessId de los responses
```

---

## Documentos relacionados

- `ADR-001-business-concept-and-companyid-migration.md` — Plan detallado de migración
- `ADR-006-business-as-tenant-root.md` — Por qué Business es la raíz del tenant
- `docs/domain/12-open-questions.md` — Lista completa de preguntas (Q-001/002/003/014 ya resueltas)
