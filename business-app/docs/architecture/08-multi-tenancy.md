# 08 — Multi-Tenancy

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

El ERP es multi-tenant desde su diseño fundamental. Cada Business es un tenant independiente. Sus datos están completamente aislados de los datos de cualquier otro Business.

---

## Modelo de tenancy

### Un tenant = un Business

```
Business A (ej. "JS Freelance Services")
├── Users de Business A
├── Customers de Business A
├── Contracts de Business A
├── WorkEvents de Business A
├── Invoices de Business A
├── JournalEntries de Business A
└── Read Models de Business A

Business B (ej. "María García Makeup")
├── Users de Business B
├── Customers de Business B
├── ... [completamente separados de Business A]
```

Ningún dato de Business A puede ser visto, modificado, ni accedido por Business B — ni siquiera por error de código.

---

## Estrategia de aislamiento: Shared Database, Shared Schema

El ERP usa una base de datos compartida con aislamiento por `businessId` en cada documento. No hay bases de datos separadas por tenant.

```
APPROACH ELEGIDO: Shared Database, Shared Schema
  (+) Operacionalmente simple — un solo cluster MongoDB
  (+) Fácil de migrar esquemas (una sola colección)
  (+) Eficiente en recursos para miles de pequeños tenants
  (-) Requiere disciplina en el código para no mezclar datos
  (-) Un bug de tenant scope puede exponer datos de otro tenant
```

La contrapartida negativa se mitiga con:
1. `businessId` requerido en todas las entidades de negocio (no nullable, indexado)
2. Toda query de negocio incluye `{ businessId }` como filtro primario
3. Un middleware de Application Layer verifica que el `businessId` en el request coincide con el del JWT

---

## businessId como anchor de tenancy

`businessId` es el identificador de tenant en todas las colecciones de negocio. Es el primer campo en todos los índices compuestos.

```
Índice correcto:
  { businessId: 1, status: 1 }           ← businessId primero
  { businessId: 1, date: 1 }
  { businessId: 1, customerId: 1 }

Índice incorrecto (permite full collection scan):
  { status: 1 }                           ← sin businessId
  { date: 1 }
```

La regla del índice no es solo de performance. Es de seguridad: una query sin `businessId` en el filtro puede potencialmente retornar datos de múltiples tenants.

---

## El flujo de tenant scope en cada request

```
HTTP Request
    │
    │  JWT: { sub: userId, businessId: X }
    ▼
GlobalAuthGuard
    │
    │  valida JWT
    │  extrae userId y businessId
    │  adjunta AuthContext al request
    ▼
Application Layer
    │
    │  Lee AuthContext.businessId
    │  Pasa businessId a todos los Domain Services y Repositories
    ▼
Domain Layer
    │
    │  Todas las operaciones incluyen businessId
    ▼
Infrastructure Layer (MongoDB)
    │
    │  Toda query incluye { businessId: AuthContext.businessId }
    ▼
Response
    │
    │  Solo datos del Business del usuario autenticado
```

---

## Aislamiento por entidad

### Entidades siempre aisladas por businessId

| Entidad | Colección | businessId |
|---|---|---|
| Business | `businesses` | Es el propio ID |
| FiscalProfile | `fiscal_profiles` | `businessId` → índice único |
| Customer | `customers` | `businessId` index |
| Contact | `contacts` | `businessId` index |
| Contract | `contracts` | `businessId` index |
| Rate | `rates` | `businessId` index |
| CalendarIntegration | `calendar_integrations` | `businessId` index |
| WorkEvent | `work_events` | `businessId` index (primario en compuesto) |
| Invoice | `invoices` | `businessId` index |
| InvoiceItem | `invoice_items` | `businessId` index |
| Payment | `payments` | `businessId` index |
| ChartOfAccounts | `chart_of_accounts` | `businessId` índice único |
| JournalEntry | `journal_entries` | `businessId` index |
| CommunicationConnection | `integration_connections` | `businessId` index |
| CommunicationLog | `communication_logs` | `businessId` index |
| Read Models | varias colecciones | `businessId` index |

### Entidades compartidas (no por businessId)

| Entidad | Colección | Scope |
|---|---|---|
| User | `users` | Por `businessId` via user document |
| RefreshToken | `refresh_tokens` | Por `userId` |
| Invitation | `invitations` | Por `businessId` |
| PostingRule | `posting_rules` | Por `jurisdiction` (compartidas o por businessId) |
| FiscalPeriod | `fiscal_periods` | Por `businessId` |

---

## Autorización dentro del tenant

El aislamiento por `businessId` garantiza que un Business no acceda a datos de otro. Pero dentro del mismo Business, no todos los usuarios tienen los mismos permisos.

### Modelo de roles

| Rol | Scope | Descripción |
|---|---|---|
| `platform_admin` | Global | Administra la plataforma. Ve todos los Businesses. |
| `business_owner` | Business | Acceso completo dentro de su Business. |
| `business_admin` | Business | Gestión operativa sin acciones destructivas. |
| `accountant` | Business | Acceso financiero: facturas, pagos, reportes. |
| `staff` | Business | Acceso operativo: WorkEvents, Customers. |
| `viewer` | Business | Solo lectura. |

### Matriz de permisos por entidad

| Entidad | business_owner | business_admin | accountant | staff | viewer |
|---|---|---|---|---|---|
| Business / FiscalProfile | R/W | R | R | — | — |
| Customer / Contact | R/W | R/W | R | R | R |
| Contract / Rate | R/W | R/W | R | R | R |
| WorkEvent | R/W | R/W | R | R/W (propio) | R |
| Invoice | R/W | R/W | R/W | R | R |
| Payment | R/W | R/W | R/W | — | R |
| ChartOfAccounts | R/W | R | R/W | — | — |
| JournalEntry | R | — | R | — | — |
| CommunicationConnection | R/W | R | — | — | — |
| CommunicationLog | R | R | R | — | — |
| Read Models / Reports | R (todos) | R | R (fin.) | R (op.) | R (op.) |

---

## Platform Admin y acceso multi-tenant

El `platform_admin` tiene acceso global — puede ver todos los Businesses. Pero hay reglas explícitas:

1. **Un platform_admin no puede impersonar a un Business Owner** — no puede editar datos del Business sin permiso explícito.
2. **El acceso del platform_admin está siempre auditado** — cada acción que toca datos de un Business usuario queda en el audit log.
3. **El platform_admin gestiona la plataforma, no los Businesses** — puede ver datos de diagnóstico pero no debe operar dentro del Business de un usuario.

```
platform_admin puede:
  → Ver lista de todos los Businesses (nombre, país, plan)
  → Ver métricas agregadas de la plataforma
  → Gestionar Posting Rules globales
  → Responder tickets de soporte (solo lectura de datos)
  → Bootstrap la Platform Company

platform_admin NO puede:
  → Editar facturas de un Business usuario
  → Modificar el Chart of Accounts de un Business usuario
  → Ver contraseñas o tokens de usuarios
  → Transferir datos entre Businesses
```

---

## Seguridad de datos en reposo y en tránsito

### En reposo
- **Credenciales de integraciones:** AES-256-GCM encriptadas en el campo, no a nivel de disco
- **Tokens de integración:** prefijo visible (primeros 12 chars), resto encriptado
- **Contraseñas:** bcrypt con 12 rondas — nunca almacenadas en texto plano
- **Datos financieros:** no requieren encriptación adicional a nivel de campo (MongoDB encryption at rest en producción)

### En tránsito
- TLS 1.3 en todos los endpoints
- JWT firmado con RS256 (clave pública/privada)
- Tokens de integración en headers, nunca en URLs

---

## Aislamiento de Analytics y Read Models

Los Read Models también están aislados por `businessId`. Cuando el Analytics engine construye proyecciones, solo procesa Domain Events del Business correspondiente.

```
// El query de un Read Model siempre incluye businessId
RevenueByPeriodView.find({ businessId: AuthContext.businessId, period: 'YYYY-MM' })
```

**Caso especial — Benchmarking anónimo (futuro):**
En el futuro, el sistema podría ofrecer benchmarking entre sectores ("tu tasa de cobro vs promedio del sector hospitality"). Estos datos se procesan como aggregaciones anónimas — nunca se expone el businessId de otro tenant, solo estadísticas agregadas.

---

## Onboarding de un nuevo tenant

```
1. Usuario completa formulario de registro
   → Nombre, email, contraseña, nombre del negocio, país

2. Identity crea el User
   → UserRegistered event publicado

3. Business crea el Business
   → businessId generado
   → BusinessCreated event publicado

4. Accounting inicializa el Chart of Accounts
   → Template estándar para la jurisdicción (AU, NZ, etc.)
   → ChartOfAccounts creado con ~50-100 cuentas estándar

5. Financial configura las Posting Rules estándar
   → Para la jurisdicción declarada

6. Communication envía el email de verificación
   → Usando la CommunicationConnection de la Platform Company

7. Business Owner accede al portal
   → Primera tarea: configurar FiscalProfile (ABN, banco, GST)
   → Segunda tarea: conectar CommunicationConnection para su Business
```

---

## Offboarding de un tenant (Cancelación)

```
1. Business Owner cancela la cuenta
2. Todos los datos quedan en estado 'archived' durante 30 días
3. Exports de datos disponibles (JSON, CSV, PDF de todas las facturas)
4. Después de 30 días: eliminación definitiva según GDPR/Privacy Act
5. Audit log de la eliminación se retiene por 7 años (requerimiento legal)
```
