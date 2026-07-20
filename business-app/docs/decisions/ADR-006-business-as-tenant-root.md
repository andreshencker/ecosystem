# ADR-006: Business como raíz del tenant en el modelo multi-tenancy

**Fecha:** 2026-07-05
**Estado:** Aceptado
**Autor:** Architecture Review Session

---

## Contexto

### El problema de la unidad de aislamiento en un SaaS multi-tenant

Un ERP en modo SaaS tiene múltiples "cuentas" coexistiendo en la misma plataforma. Cada cuenta tiene sus propios datos completamente aislados de las demás. La pregunta arquitectónica fundamental es: ¿qué es la unidad de aislamiento?

Esta decisión afecta:
- El JWT payload (qué campo identifica el tenant)
- Todos los schemas de base de datos (qué campo es el discriminador de tenant)
- El modelo de permisos (¿los permisos son por usuario o por tenant?)
- La facturación de la plataforma (¿se factura al usuario o a la cuenta?)
- La API de integración (¿qué scope tiene un token externo?)

### Opciones de diseño

**Opción A — User como tenant root**

Cada User tiene sus propios datos. Un User solo ve sus propias facturas, sus propios clientes, su propio ledger.

```
User A:
  ├── invoices[] (solo de A)
  ├── customers[] (solo de A)
  └── work_events[] (solo de A)

User B:
  ├── invoices[] (solo de B)
  ├── customers[] (solo de B)
  └── work_events[] (solo de B)
```

Consecuencias:
- (+) Simple para el caso de freelancer individual
- (-) ¿Cómo colaboran múltiples usuarios en el mismo negocio? Imposible sin rediseño completo
- (-) Un negocio con 5 empleados necesitaría compartir una sola cuenta de usuario
- (-) El concepto de "empresa" no existe → no hay perfil fiscal del negocio
- (-) Imposible modelar permisos por rol dentro del negocio (dueño vs empleado vs contador)

**Opción B — Organization/Workspace como tenant root (genérico)**

Un concepto abstracto "Organization" o "Workspace" es el tenant. Los Users pertenecen a Organizations.

```
Organization X ("Acme Freelance"):
  ├── Members: [User A (owner), User B (staff), User C (viewer)]
  ├── invoices[]
  ├── customers[]
  └── work_events[]
```

Consecuencias:
- (+) Flexible — puede modelar empresas y equipos
- (+) Roles por organización
- (-) "Organization" es genérico — no tiene semántica de negocio
- (-) Un ERP de facturación necesita conceptos fiscales que "Organization" no tiene (ABN, GST, moneda)
- (-) El perfil fiscal vive... ¿dónde? ¿En un concepto separado `FiscalProfile`?
- (-) Naming confuso: ¿qué es un "member"? ¿Es un Employee? ¿Un User? ¿Un Contact?

**Opción C — Business como tenant root (dominio-driven)**

El concepto de `Business` (el negocio del usuario) es el tenant. Es la empresa que factura. Tiene nombre, ABN, dirección, moneda, GMT, logo. Los Users pertenecen al Business con roles específicos.

```
Business ("JS Freelance Services Pty Ltd"):
  ├── Users: [User A (business_owner), User B (business_admin), User C (staff)]
  ├── FiscalProfile (ABN, GST, cuenta bancaria)
  ├── customers[] (clientes del negocio)
  ├── invoices[] (facturas emitidas por el negocio)
  ├── work_events[] (trabajo realizado por el negocio)
  └── journal_entries[] (contabilidad del negocio)

Platform:
  └── isPlatformCompany = true (el Business del operador SaaS)
```

Consecuencias:
- (+) El lenguaje del dominio coincide con el lenguaje del negocio
- (+) El `businessId` es el anchor de multi-tenancy en todas las entidades
- (+) Los roles son por Business: `business_owner`, `business_admin`, `staff`, `accountant`
- (+) El FiscalProfile (ABN, GST) existe naturalmente dentro del Business
- (+) La Platform Company es simplemente un Business con `isPlatformCompany: true`
- (+) La facturación de la plataforma es por Business
- (-) La migración de `Company` → `Business` requiere trabajo (ya documentada en ADR-001)
- (-) Un User que trabaja para múltiples Businesses necesita múltiples cuentas en v1

---

## Decisión

**Business es la raíz del tenant. `businessId` es el discriminador universal en todas las entidades de negocio.**

---

## Justificación

### 1. El lenguaje del dominio es el lenguaje del código

Un ERP diseñado con DDD debe reflejar los conceptos del negocio en el código. La persona que usa este ERP no piensa en "organizations" ni "workspaces". Piensa en su negocio: "JS Freelance Services" tiene un ABN, factura a clients, tiene 3 empleados.

Usar `Business` como tenant root hace que el código sea inmediatamente comprensible para alguien con conocimiento del dominio. `invoice.businessId` es inequívoco: es la factura del Business.

### 2. El FiscalProfile pertenece naturalmente al Business

Un ERP de facturación necesita un perfil fiscal: ABN en Australia, NIF en España, BN en Canadá. Este perfil pertenece a la entidad que emite facturas — que es el Business. Si el tenant fuera "User" u "Organization", el FiscalProfile sería un concepto flotante.

```
CORRECTO con Business como tenant:
  Business.fiscalProfile.abn = '12 345 678 901'
  invoice.businessId → Business.fiscalProfile.abn (para generar el header de la factura)

INCORRECTO con Organization como tenant:
  organization.someConfig.abn = '12 345 678 901'
  invoice.organizationId → ??? (qué configura ABN en una Organization genérica)
```

### 3. La Platform Company es un Business especial, no una excepción

El operador de la plataforma SaaS también tiene un Business en el sistema: "Invoice App Pty Ltd". Este Business tiene `isPlatformCompany: true`. Emite sus propias facturas de suscripción, tiene sus propias configuraciones de comunicación.

Con Business como tenant root, la Platform Company encaja naturalmente sin necesidad de un concepto separado de "plataforma". Sin Business, la Platform Company sería una excepción al modelo de tenant que requeriría código especial.

### 4. Los roles son por Business, no globales

```
User A puede ser:
  - business_owner en Business X (su empresa)
  - accountant en Business Y (empresa de un cliente — futuro)

Con User como tenant root: imposible
Con Organization genérico: posible pero sin semántica contable
Con Business como tenant root: modelado naturalmente
```

---

## Invariantes del modelo

### Invariante 1 — Un Business debe existir antes que cualquier otra entidad del dominio

```
Orden de creación garantizado:
  1. User registrado → Identity emite UserRegistered
  2. Business creado → Business emite BusinessCreated
  3. ChartOfAccounts inicializado → Accounting consume BusinessCreated
  4. PostingRules configuradas → Financial consume BusinessCreated
  5. CommunicationConnection puede crearse → Communication consume BusinessCreated

No existe Customer, Invoice, WorkEvent, ni JournalEntry sin un Business previo.
```

### Invariante 2 — businessId en un documento es inmutable

Una vez asignado `businessId` a una entidad, no puede transferirse a otro Business. Una factura de Business A no puede "moverse" a Business B.

### Invariante 3 — Toda query de negocio incluye businessId como primer filtro

```
// Correcto — businessId es el primer discriminador
Invoice.find({ businessId: ctx.businessId, status: 'sent' })

// Incorrecto — puede retornar datos de múltiples Businesses
Invoice.find({ status: 'sent' })
```

### Invariante 4 — Un User solo pertenece a un Business en v1

```
JWT payload:
{
  sub: userId,
  businessId: 'ObjectId_del_Business',  // ← singular, no array
  role: 'business_owner'
}
```

Si en el futuro un User puede pertenecer a múltiples Businesses, el JWT necesitará un cambio de schema. Esta es una decisión de Fase 8+ (ver 12-open-questions.md Q-003).

---

## isPlatformCompany — diseño del Business especial

```
Platform Company:
  businessId:       'ObjectId_platform'
  businessName:     'Invoice App Pty Ltd'
  isPlatformCompany: true
  ownerUserId:      'ObjectId_platform_admin'

Reglas especiales:
  - Solo puede existir uno en la plataforma
  - No puede eliminarse
  - Sus CommunicationConnections se usan para emails de la plataforma
    (verificación de email, invitaciones de staff)
  - Sus PostingRules son las reglas globales por defecto
```

---

## Implicaciones para el diseño de la API y el JWT

### JWT payload canónico

```json
{
  "sub":          "userId_ObjectId",
  "type":         "access",
  "businessId":   "businessId_ObjectId",
  "businessKey":  "js-freelance-services",
  "role":         "business_owner",
  "scope":        "business",
  "iat":          1720000000,
  "exp":          1720003600
}
```

### AuthContext en el backend

```typescript
interface AuthContext {
  actorType:   'user' | 'platform_admin' | 'integration_token';
  userId?:     ObjectId;
  businessId:  ObjectId;
  businessKey: string;
  role:        BusinessRole;
}
```

El `businessId` del AuthContext es la fuente de verdad para todas las operaciones. No se acepta ningún `businessId` del body del request — siempre del JWT.

---

## Evolución futura: multi-Business por User

La decisión actual (un User = un Business) es correcta para v1. Si en el futuro se necesita que un User gestione múltiples Businesses:

```
Opción futura — Business switching:
  1. El User tiene businessIds: [A, B, C] en su perfil
  2. El JWT incluye el businessId activo: { sub, businessId: A, ... }
  3. El User puede "cambiar de negocio" desde la UI → emite un nuevo JWT con businessId: B
  4. No hay referencias a B visibles en el contexto de A
```

Esta extensión es compatible con el diseño actual porque:
- `businessId` sigue siendo singular en el JWT (solo el activo)
- Las entidades de negocio siguen usando `businessId` singular
- Solo el proceso de login/switch necesita actualizarse

El cambio no requiere migrar schemas de base de datos.

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Bug de tenant scope (fallo de filtro por businessId) | Baja | Crítico | Test de aislamiento obligatorio en cada colección. Middleware de verificación. |
| Transfer accidental de businessId en colección | Muy baja | Crítico | businessId es inmutable a nivel de dominio. No existe operación de "cambiar businessId". |
| Platform Admin accede a datos de tenant de forma no auditada | Baja | Alto | Todo acceso del platform_admin a datos de Business usuario queda en audit log. |
| Inconsistencia durante migración companyId → businessId (ADR-001) | Media | Alto | Scripts de migración atómicos. Ver ADR-001 sección de riesgos. |

---

## Documentos relacionados

- `ADR-001-business-concept-and-companyid-migration.md` — La migración técnica de Company → Business
- `docs/architecture/08-multi-tenancy.md` — Implementación del modelo de multi-tenancy
- `docs/domain/12-open-questions.md` Q-003 — Decisión futura sobre User en múltiples Businesses
- `docs/domain/03-bounded-contexts.md` BC-02 — Business domain description
