# ADR-001: Adopción de Business como concepto oficial del dominio y migración de companyId a businessId

**Fecha:** 2026-07-05
**Estado:** Propuesto — pendiente de aprobación para implementación
**Autor:** Architecture Review Session

---

## Contexto

### El problema de semántica

Invoice App tiene ahora dos conceptos de empresa distintos:

- **Business** — la cuenta/empresa del usuario dentro de Invoice App. Es quien emite facturas, tiene usuarios, tiene perfil fiscal, tiene integraciones.
- **Customer** — la empresa o persona a quien el Business factura. Recibe facturas, no tiene acceso a la aplicación.

El schema actual `Company` fue pensado originalmente solo para representar al Business. Sin embargo, el nombre genérico "Company" generó ambigüedad desde el momento en que se introdujo el concepto de Customer: ¿es un Customer también una Company? ¿Las consultas sobre `companies` retornan solo los Businesses del usuario o también sus clientes?

El documento de dominio `invoice-app-domain-model.md` (2026-07-05) formalizó esta distinción y estableció la regla:

> **Business factura a Customer. Customer no es un Business.**

### El estado actual del código

El codebase usa `companyId` en tres capas distintas con significados relacionados pero técnicamente distintos:

| Capa | Campo | Valor que contiene |
|---|---|---|
| Schema `User` | `user.companyId` | ObjectId del Business al que pertenece el usuario |
| Schema `Company` | `company.companyKey` | Slug del Business |
| Schema `Invitation` | `invitation.companyId` | ObjectId del Business de la invitación |
| Schema `IntegrationConnection` | `connection.companyId` | ObjectId del Business que tiene la conexión |
| `AuthContext` | `ctx.companyId` | ObjectId del Business del usuario autenticado |
| JWT payload | `payload.companyId` | ObjectId del Business, emitido en el token |
| API response `UserResponseDto` | `.companyId` | Retornado al frontend |
| Invitation API response | `.companyId` | Retornado al frontend |

Todos estos usos de `companyId` se refieren al mismo concepto: el Business. Ninguno se refiere a un Customer. El nombre `companyId` es técnicamente correcto pero semánticamente desactualizado.

### Por qué actuar ahora

El momento óptimo para este renombre es **antes de crear las 10 entidades nuevas** del dominio (Customer, Contract, Rate, WorkEvent, Invoice, InvoiceItem, Payment, FiscalProfile, CalendarIntegration, CommunicationLog). Si se crean esas entidades usando `businessId` mientras las entidades existentes usan `companyId`, el resultado será un codebase inconsistente donde algunas entidades dicen `businessId` y otras dicen `companyId` para el mismo concepto.

### Alcance del cambio

El relevamiento del codebase muestra:

- **~130 referencias** a `companyId` en el backend (`src/**/*.ts`)
- **~30 referencias** a `companyKey` en el backend
- **~20 referencias** a `companyName` en el backend
- **5 schemas** afectados: `User`, `Company`, `CompanySmtp`, `Invitation`, `IntegrationConnection`
- **6 colecciones** en MongoDB potencialmente afectadas
- **2 DTOs de API pública** afectados: `UserResponseDto`, `InvitationResponseDto`
- **1 JWT payload** afectado (contrato externo)
- **1 frontend** afectado (consulta `companyId` en respuestas)

---

## Decisión

### Decisión central

Adoptar **Business** como el concepto oficial del dominio de Invoice App para referirse a la empresa/cuenta propietaria del usuario.

Esto implica:

1. Renombrar la clase Mongoose `Company` → `Business`
2. Renombrar la colección MongoDB `companies` → `businesses`
3. Renombrar los campos `companyId`, `companyKey`, `companyName` → `businessId`, `businessKey`, `businessName` en todos los schemas
4. Migrar el JWT payload y la `AuthContext`
5. Migrar los DTOs de API pública con un período de deprecación

### Lo que NO cambia con esta decisión

- **Customer es una entidad diferente** — el renombre de Company→Business no crea Customer. Customer sigue siendo una entidad nueva por implementar.
- **La lógica de negocio no cambia** — solo los nombres de campos y la clase.
- **Los endpoints de API no cambian de ruta** — solo cambian los campos en los bodies y responses.
- **isPlatformCompany no cambia de nombre** — el flag que identifica la empresa base de Invoice App.

---

## Estrategia de migración

La migración se divide en cuatro fases independientes. Cada fase puede ejecutarse y desplegarse por separado. Ninguna fase rompe la aplicación si se ejecuta correctamente.

---

### Fase 1 — Renombre de la clase TypeScript y la colección MongoDB

**Objetivo:** Cambiar la identidad técnica sin tocar los campos de los documentos.
**Impacto en MongoDB:** Sí — renombrar la colección.
**Impacto en código:** Sí — renombrar la clase y todas sus referencias.
**Impacto en frontend:** No.
**Impacto en JWT:** No.

#### Paso 1.1 — Crear el nuevo schema

```typescript
// ANTES: modules/company/schemas/company.schema.ts
@Schema({ collection: 'companies', ... })
export class Company { ... }
export const CompanySchema = SchemaFactory.createForClass(Company);

// DESPUÉS: modules/business/schemas/business.schema.ts
@Schema({ collection: 'businesses', ... })
export class Business { ... }
export const BusinessSchema = SchemaFactory.createForClass(Business);
```

Los campos internos (companyKey, companyName, ownerUserId, etc.) se migran en la Fase 2. En la Fase 1 solo cambia el nombre de la clase y la colección.

#### Paso 1.2 — Script de migración MongoDB

```javascript
// Renombrar la colección (comando de Atlas o mongosh)
db.companies.renameCollection('businesses');

// Verificar
db.businesses.countDocuments(); // debe coincidir con el count previo
```

> **Ventana de mantenimiento requerida:** Este comando bloquea escrituras en la colección durante el renombre. En producción con datos reales requiere una ventana de mantenimiento de ~30 segundos.

#### Paso 1.3 — Actualizar todas las referencias de código

Renombrar la clase en todos los archivos que importan `Company`:

| Archivo | Cambio |
|---|---|
| `users.service.ts` | `@InjectModel(Company.name)` → `@InjectModel(Business.name)` |
| `users.module.ts` | `MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }])` → Business |
| `company-portal.service.ts` | Renombrar a `business-portal.service.ts`; `companyModel` → `businessModel` |
| `company-portal.module.ts` | Renombrar módulo |
| `user-invitations.service.ts` | `companyModel` → `businessModel` |
| `communication-connection.service.ts` | `companyId: new Types.ObjectId(...)` — variable local, no campo de schema |

---

### Fase 2 — Migración de campos en los schemas existentes

**Objetivo:** Renombrar los campos dentro de los documentos MongoDB.
**Impacto en MongoDB:** Sí — $rename en cada colección.
**Impacto en código:** Sí — actualizar todos los campos en código TypeScript.
**Impacto en frontend:** Parcial — si el frontend lee `companyId` de las respuestas, debe actualizarse.
**Impacto en JWT:** No aún.

#### Paso 2.1 — Schema Business (colección `businesses`)

| Campo actual | Campo nuevo | Tipo |
|---|---|---|
| `companyKey` | `businessKey` | String, único |
| `companyName` | `businessName` | String |
| `ownerUserId` | `ownerUserId` | **sin cambio** — es una referencia al User, no al Business |

```javascript
// Script MongoDB — colección businesses
db.businesses.updateMany({}, {
  $rename: {
    'companyKey': 'businessKey',
    'companyName': 'businessName'
  }
});
```

#### Paso 2.2 — Schema User (colección `users`)

| Campo actual | Campo nuevo | Tipo |
|---|---|---|
| `companyId` | `businessId` | String → ObjectId (también Fase 0) |
| `companyKey` | `businessKey` | String |

```javascript
// Script MongoDB — colección users
db.users.updateMany({}, {
  $rename: {
    'companyId': 'businessId',
    'companyKey': 'businessKey'
  }
});
```

#### Paso 2.3 — Schema CompanySmtp (colección `company_smtp`)

| Campo actual | Campo nuevo | Notas |
|---|---|---|
| `companyId` | `businessId` | Considerar renombrar también la colección a `business_smtp` |

```javascript
db.company_smtp.renameCollection('business_smtp');
db.business_smtp.updateMany({}, { $rename: { 'companyId': 'businessId' } });
```

#### Paso 2.4 — Schema Invitation (colección `invitations`)

| Campo actual | Campo nuevo |
|---|---|
| `companyId` | `businessId` |
| `companyKey` | `businessKey` |

```javascript
db.invitations.updateMany({}, {
  $rename: {
    'companyId': 'businessId',
    'companyKey': 'businessKey'
  }
});
```

#### Paso 2.5 — Schema IntegrationConnection (colección `integration_connections`)

| Campo actual | Campo nuevo | Notas |
|---|---|---|
| `companyId` | `businessId` | Ya es ObjectId — solo renombre |

```javascript
db.integration_connections.updateMany({}, {
  $rename: { 'companyId': 'businessId' }
});
```

#### Paso 2.6 — Actualizar índices

Los índices que usan `companyId` o `companyKey` deben recrearse con los nuevos nombres:

```javascript
// Ejemplo para users
db.users.dropIndex('companyId_1');
db.users.createIndex({ businessId: 1 }, { name: 'businessId_1' });
```

> **Riesgo:** En colecciones grandes, `createIndex` puede tardar minutos. Usar `createIndex({ ..., background: true })` en MongoDB ≤ 4.4, o simplemente ejecutarlo — en MongoDB 5+ los índices se construyen en background por defecto.

---

### Fase 3 — Migración del JWT payload y la AuthContext

**Objetivo:** Emitir `businessId` en lugar de `companyId` en el token JWT.
**Impacto en MongoDB:** No.
**Impacto en código:** Sí — `AuthService.issueTokens()` y `GlobalAuthGuard`.
**Impacto en frontend:** Sí — el frontend puede estar leyendo `companyId` del payload decodificado.

#### Contexto crítico

El JWT es un **contrato externo**. Los tokens emitidos antes de la migración seguirán llegando al servidor durante su TTL (típicamente 15 minutos para access tokens, 30 días para refresh tokens). El servidor debe aceptar ambos.

La estrategia es idéntica a la que ya se aplicó en Communications al migrar `organizationId` → `companyId`:

```typescript
// En GlobalAuthGuard — Business App (actualmente aún no migrado)
const payload = await this.jwtService.verifyAsync<{
  sub: string;
  type?: string;
  organizationId?: string;   // legado, tokens viejos
  companyId?: string;        // legado, tokens intermedios
  businessId?: string;       // nuevo, tokens post-Fase 3
}>(token, { secret });

const authContext: AuthContext = {
  actorType: 'user',
  userId: payload.sub,
  businessId: payload.businessId ?? payload.companyId ?? payload.organizationId,
};
```

```typescript
// En AuthService.issueTokens() — emitir businessId
const accessPayload = {
  sub:        userId,
  type:       'access',
  businessId: user.businessId,  // nuevo campo emitido
  businessKey: user.businessKey,
};
```

#### Período de transición

```
Día 0:     Deploy Fase 3 — servidor emite businessId en nuevos tokens
           servidor acepta businessId | companyId | organizationId en tokens entrantes
Día 1–30:  Tokens viejos (con companyId) expiran progresivamente
Día 31+:   Solo llegan tokens con businessId
           Se puede eliminar el fallback (Fase 4 cleanup)
```

---

### Fase 4 — Migración de DTOs de API pública y frontend

**Objetivo:** Cambiar los nombres de campos en los responses REST que el frontend consume.
**Impacto en MongoDB:** No.
**Impacto en código:** Sí — `UserResponseDto`, `InvitationResponseDto`, y sus mappers.
**Impacto en frontend:** Sí — el frontend debe actualizarse para leer `businessId`.

#### Estrategia de compatibilidad hacia atrás

Durante la transición, los DTOs pueden emitir **ambos campos** simultáneamente:

```typescript
// UserResponseDto durante la transición
class UserResponseDto {
  businessId!: string | null;

  /** @deprecated Use businessId instead. Will be removed in v2. */
  companyId!: string | null;  // alias — mismo valor

  static from(user: UserDocument): UserResponseDto {
    const dto = new UserResponseDto();
    dto.businessId = user.businessId ?? null;
    dto.companyId  = dto.businessId;  // alias temporal
    return dto;
  }
}
```

Una vez que el frontend esté actualizado para leer `businessId`, se elimina el alias `companyId` del DTO.

---

## Impacto en MongoDB — resumen

| Colección actual | Colección nueva | Campos renombrados | Script necesario |
|---|---|---|---|
| `companies` | `businesses` | `companyKey→businessKey`, `companyName→businessName` | ✅ |
| `users` | `users` (sin cambio) | `companyId→businessId`, `companyKey→businessKey` | ✅ |
| `company_smtp` | `business_smtp` | `companyId→businessId` | ✅ |
| `invitations` | `invitations` (sin cambio) | `companyId→businessId`, `companyKey→businessKey` | ✅ |
| `integration_connections` | `integration_connections` (sin cambio) | `companyId→businessId` | ✅ |
| `refresh_tokens` | `refresh_tokens` (sin cambio) | Sin cambio — `userId` no se afecta | No |

**Total de scripts de migración:** 5 scripts `$rename` + 2 `renameCollection`

---

## Impacto en el código — resumen

| Capa | Archivos afectados | Tipo de cambio |
|---|---|---|
| **Schemas Mongoose** | `user.schema.ts`, `company.schema.ts`, `company-smtp.schema.ts`, `invitation.schema.ts`, `communication-connection.schema.ts` | Renombre de campos y clase |
| **Services** | `users.service.ts`, `auth.service.ts`, `company-portal.service.ts`, `user-invitations.service.ts`, `communication-connection.service.ts`, `communication-client.service.ts` | Renombre de variables locales y campos |
| **Controllers** | `users.controller.ts`, `company-portal.controller.ts`, `user-invitations.controller.ts` | Renombre de params y fields |
| **DTOs** | `user-response.dto.ts`, `invitation-response.dto.ts`, `update-company-portal.dto.ts` | Renombre de campos (con alias temporal) |
| **Mappers** | `invitation.mapper.ts` | Renombre de campos |
| **Guards** | `global-auth.guard.ts` | Actualización del payload JWT y AuthContext |
| **Auth** | `auth.service.ts`, `jwt.strategy.ts` | Payload emitido y validado |
| **AuthContext types** | `auth-context.types.ts` | `companyId` → `businessId`, `companyKey` → `businessKey` |
| **Módulos** | `company-portal.module.ts` → `business-portal.module.ts` | Renombre de módulo y directorio |

**Referencias totales estimadas a actualizar:** ~200 (130 `companyId` + 30 `companyKey` + 20 `companyName` + 20 nombres de clase/módulo)

---

## Riesgos

### R1 — JWT tokens en circulación (alto)

**Descripción:** En el momento del deploy de la Fase 3, habrá refresh tokens activos en MongoDB que tienen hasta 30 días de vida. Estos tokens fueron emitidos con `companyId` en el payload. Si el guard no implementa el fallback correcto, todos los usuarios activos perderán su sesión al siguiente request autenticado.

**Mitigación:** Implementar el fallback triple `businessId ?? companyId ?? organizationId` en el guard antes del deploy. Este patrón ya fue validado en Communications.

**Residual:** Bajo — el fallback protege la sesión de todos los usuarios existentes.

---

### R2 — Frontend desactualizado (medio)

**Descripción:** El frontend actualmente lee `companyId` de las respuestas de `/users/me`, `/users`, e invitations. Si se elimina el campo sin actualizar el frontend, la UI rompe.

**Mitigación:** Emitir ambos campos (`businessId` + `companyId` como alias) durante el período de transición. Coordinar la eliminación del alias con el deploy del frontend actualizado.

**Residual:** Bajo si se coordina correctamente.

---

### R3 — Scripts de migración irreversibles (alto en producción)

**Descripción:** Los comandos `$rename` en MongoDB son irreversibles sin un script de rollback preparado. Si la migración se ejecuta a medias (ej. falla a mitad del script de `users`), habrá documentos con `businessId` y documentos con `companyId` en la misma colección.

**Mitigación:**
1. Ejecutar los scripts en ambiente de staging primero.
2. Tomar snapshot/backup antes de ejecutar en producción.
3. Preparar script de rollback (`$rename` inverso) antes de ejecutar la migración forward.
4. Validar counts antes y después de cada `$rename`.

**Residual:** Medio — si el script falla a mitad, la aplicación puede arrancar en modo mixto hasta completar el rollback.

---

### R4 — Inconsistencia temporal entre Fases (medio)

**Descripción:** Si se despliega la Fase 1 (clase renombrada) sin completar la Fase 2 (campos de MongoDB), el código TypeScript usará `business.businessKey` pero los documentos en MongoDB tendrán `companyKey`. Mongoose retornará `undefined` para `businessKey`.

**Mitigación:** Ejecutar las Fases 1 y 2 en el mismo deploy (misma ventana de mantenimiento).

**Residual:** Bajo si se respeta el orden de ejecución.

---

### R5 — organizationId aún presente en Business App (bajo)

**Descripción:** El `GlobalAuthGuard` de Business App todavía escribe `organizationId` en `AuthContext` (a diferencia de Communications, donde ya fue migrado a `companyId`). La Fase 3 debe incluir también la limpieza de `organizationId`.

**Mitigación:** Incluir en la Fase 3 la migración de `organizationId` → `companyId` (que Communications ya hizo) y luego de `companyId` → `businessId` como un solo paso.

```typescript
// Orden de migración en AuthContext.types.ts:
// organizationId (legacy) → companyId (transitional) → businessId (final)
```

**Residual:** Ninguno si se hace en la Fase 3.

---

### R6 — Comunicaciones con Business App llaman a `companyId` del body (bajo)

**Descripción:** `CommunicationClientService` envía `companyId` en el body a Communications. Communications ya no usa ese campo (fue establecido en ADR-007 que ignora el body). El campo es informacional.

**Mitigación:** Este campo puede renombrarse a `businessId` como parte de la Fase 2 sin impacto funcional, ya que Communications lo ignora.

**Residual:** Ninguno.

---

## Beneficios

### B1 — Eliminación de ambigüedad permanente

Una vez completada la migración, no existirá ninguna entidad, campo, variable o DTO que use `company*` para referirse al Business. Cualquier desarrollador que lea `businessId` sabe exactamente qué significa. Cualquier lectura de `customerId` sabe que es el cliente.

### B2 — Nuevas entidades sin inconsistencia desde el primer día

Las 10 entidades nuevas del dominio (Customer, Contract, Rate, WorkEvent, Invoice, InvoiceItem, Payment, FiscalProfile, CalendarIntegration, CommunicationLog) ya pueden crearse usando `businessId` desde el inicio, sin crear deuda técnica de nomenclatura.

### B3 — Queries multi-tenant expresivas

```typescript
// ANTES — ambiguo
const invoices = await Invoice.find({ companyId: ctx.companyId });

// DESPUÉS — explícito
const invoices = await Invoice.find({ businessId: ctx.businessId });
// Queda claro: es la factura del Business, no del Customer
```

### B4 — Eliminación del campo organizationId heredado

La migración de AuthContext incluye remover el campo `organizationId` que es legacy de la arquitectura de Communications. Business App queda con una AuthContext limpia con solo `businessId`.

### B5 — Modelo de dominio coherente con la documentación

El dominio documentado en `invoice-app-domain-model.md` usa `businessId`. El código usará `businessId`. No habrá discrepancia entre documentación y código, lo que facilita onboarding de nuevos desarrolladores.

### B6 — Preparación para multi-business en el futuro

Si en el futuro un usuario puede pertenecer a múltiples Businesses, el campo `user.businessId` es más claro que `user.companyId` para indicar que es la pertenencia al negocio, no a una empresa genérica.

---

## Alternativas consideradas y descartadas

### Alternativa A: Mantener `companyId` técnicamente, documentar que semánticamente es Business

**Descripción:** No cambiar nada en el código. Solo documentar que `companyId` significa Business.

**Rechazada porque:**
- Las 10 entidades nuevas del dominio usarían `businessId` mientras las existentes usan `companyId`. Inconsistencia permanente.
- La confusión reaparece en cada nuevo desarrollador que lee el código.
- El problema se amplifica a medida que crece el codebase.

---

### Alternativa B: Usar `businessId` solo en entidades nuevas, `companyId` en entidades existentes

**Descripción:** Crear Customer, Contract, Rate, etc. con `businessId`, sin modificar User, Company, Invitation.

**Rechazada porque:**
- Crea inconsistencia estructural permanente: `invoice.businessId !== user.companyId` aunque sean el mismo valor.
- Las queries que unen entidades viejas con nuevas son confusas: `{ businessId: user.companyId }`.
- La deuda técnica crece con cada entidad nueva.

---

### Alternativa C: Renombrar solo la clase TypeScript pero no los campos MongoDB

**Descripción:** `Company` → `Business` en TypeScript, pero los documentos en MongoDB siguen con `companyKey`, `companyName`, `companyId`.

**Rechazada porque:**
- No elimina la ambigüedad en el lugar donde más importa: las queries de base de datos.
- Los scripts de MongoDB y los logs de base de datos siguen mostrando `companyId`, confundiendo a quienes hacen debugging directo en la DB.
- Solución incompleta que no resuelve el problema de fondo.

---

## Orden de implementación recomendado

```
FASE 0 (prerequisito, puede hacerse antes de aprobar este ADR):
├── Confirmar respuesta a P1 de invoice-app-domain-model.md
│   "¿Companyid técnico o businessId en todas las entidades?"
│   → Esta ADR responde: businessId en todas las entidades.
└── Tomar backup completo de MongoDB antes de iniciar cualquier Fase

FASE 1 (una ventana de mantenimiento, ~2 horas de trabajo):
├── Crear nuevo schema Business (colección: businesses)
├── Renombrar colección MongoDB: companies → businesses
├── Actualizar todos los imports de Company → Business en el código
├── Renombrar módulo CompanyPortalModule → BusinessPortalModule
└── Tests de smoke: login, registro, listado de usuarios

FASE 2 (misma ventana o siguiente sprint):
├── Script MongoDB: $rename companyKey→businessKey, companyName→businessName en businesses
├── Script MongoDB: $rename companyId→businessId, companyKey→businessKey en users
├── Script MongoDB: renameCollection company_smtp → business_smtp + $rename companyId→businessId
├── Script MongoDB: $rename companyId→businessId, companyKey→businessKey en invitations
├── Script MongoDB: $rename companyId→businessId en integration_connections
├── Actualizar todos los schemas TypeScript con los nuevos nombres de campo
├── Recrear índices renombrados
└── Tests de integración: CRUD completo de todas las entidades afectadas

FASE 3 (siguiente sprint):
├── Actualizar GlobalAuthGuard: payload.businessId ?? payload.companyId ?? payload.organizationId
├── Actualizar AuthService: emitir businessId en JWT
├── Limpiar organizationId de AuthContext.types.ts (legacy de Communications)
├── Actualizar AuthContext.types.ts: companyId → businessId, companyKey → businessKey
└── Smoke test: login completo, verificar que el token nuevo tiene businessId

FASE 4 (coordinar con frontend):
├── Actualizar UserResponseDto: agregar businessId, mantener companyId como alias
├── Actualizar InvitationResponseDto: ídem
├── Deploy backend con alias
├── Actualizar frontend para leer businessId
├── Deploy frontend
├── Eliminar alias companyId de los DTOs
└── Deploy backend final sin alias
```

**Duración estimada total:** 2–3 sprints de una semana cada uno.

---

## Consecuencias de aprobar este ADR

### Positivas
- El modelo de dominio queda coherente con la terminología del negocio.
- Las 10 entidades nuevas se crean sin deuda técnica de nomenclatura.
- Queries multi-tenant son expresivas e inequívocas.
- Onboarding de nuevos desarrolladores es más intuitivo.
- La `AuthContext` queda limpia sin campos legacy (`organizationId`).

### Negativas
- Requiere una ventana de mantenimiento para los scripts MongoDB en producción.
- ~200 cambios en el código distribuidos en ~20 archivos.
- Coordinación requerida entre backend y frontend para el período de transición del DTO.
- Tokens JWT viejos deben ser aceptados durante ~30 días después de la Fase 3.

### Neutrales
- La lógica de negocio no cambia — solo los nombres.
- Los endpoints REST no cambian de ruta.
- El comportamiento de la aplicación es idéntico después de la migración.

---

## Checklist de aprobación

Antes de comenzar la implementación, confirmar:

- [ ] Aprobado el renombre `Company` → `Business` como concepto de dominio
- [ ] Aprobado el renombre `companyId` → `businessId` en todas las entidades
- [ ] Confirmado que el frontend puede actualizarse en paralelo con la Fase 4
- [ ] Backup de MongoDB programado antes de iniciar Fase 1
- [ ] Scripts de rollback preparados para cada Fase
- [ ] Ambiente de staging disponible para probar los scripts antes de producción
- [ ] Decidida la ventana de mantenimiento para Fases 1+2

---

## Documentos relacionados

- `docs/domain/invoice-app-domain-model.md` — modelo de dominio oficial, sección 2 (Business vs Customer), sección 9 pregunta P1
- `docs/roles-and-permissions.md` — roles de Business App (business_owner, business_admin, etc.)
- `docs/communications/communication-event-routing.md` — integración con Communications
- `communications-app/docs/Decisions/ADR-007-Communication-Auth-and-Event-Resolution.md` — patrón de migración `organizationId → companyId` en Communications (referencia para la Fase 3)
