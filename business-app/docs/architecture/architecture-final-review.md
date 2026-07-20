# Architecture Final Review — Communications Layer

**Versión:** 1.0 | **Fecha:** 2026-07-07 | **Alcance:** Revisión pre-Sprint 3

> Este documento responde nueve preguntas fundamentales sobre la arquitectura de Communications.
> No es una lista de tareas — es un veredicto arquitectónico.

---

## Metodología

La revisión se hizo en tres pasos:

1. **Tracing**: seguir el flujo real en el código (no en los documentos) desde el Application Service hasta Communications.
2. **Stress test**: simular la implementación de 9 módulos futuros y verificar que ninguno requiere cambiar la arquitectura.
3. **Gap analysis**: identificar cada punto donde un desarrollador podría tomar una decisión diferente.

---

## Pregunta 1: ¿La arquitectura puede soportar cualquier módulo futuro?

**Respuesta: Sí.**

Se simularon los 9 módulos futuros mencionados. Ninguno requiere cambio arquitectónico:

| Módulo | Canal externo | Tipo | eventKey | Cambio arquitectónico |
|---|---|---|---|---|
| Billing | invoice_sent, payment_received, invoice_overdue | Business | `billing.invoice_sent` | ❌ Solo agregar al catálogo |
| Documents | document_shared, document_signed | Business | `documents.document_shared` | ❌ Solo agregar al catálogo |
| Payments | payment_reminder, refund_processed | Business | `payments.payment_reminder` | ❌ Solo agregar al catálogo |
| Work Orders | shift_assigned, timesheet_approved | Business | `work.shift_assigned` | ❌ Solo agregar al catálogo |
| Inventory | purchase_order_sent | Business | `inventory.purchase_order_sent` | ❌ Solo agregar al catálogo |
| CRM | lead_assigned, deal_closed | Business | `crm.lead_assigned` | ❌ Solo agregar al catálogo |
| HR | offer_sent, payslip_ready | Business | `hr.offer_sent` | ❌ Solo agregar al catálogo |
| Assets | maintenance_scheduled | Business | `assets.maintenance_alert` | ❌ Solo agregar al catálogo |
| Scheduling | schedule_published, reminder | Business | `scheduling.reminder_sent` | ❌ Solo agregar al catálogo |

En todos los casos, el patrón de implementación es idéntico:

```typescript
// En cualquier Application Service futuro
this.commClient.notifyEvent({
  type:      'company',          // siempre 'company' para módulos de negocio
  companyId: actor.businessId,   // siempre del JWT
  event:     'billing.invoice_sent',  // siempre dominio.evento del catálogo
  email:     recipient.email,
  data:      { /* variables del template */ },
});
```

La arquitectura absorbe todos los módulos futuros sin modificarse. ✅

---

## Pregunta 2: ¿Existe un único flujo?

**Respuesta: Sí — y está completamente verificado en el código.**

```
Application Service
  │
  ├── [siempre] → respuesta HTTP al Controller → Toast/Snackbar en Frontend
  │
  ├── [si aplica] → DomainEvent.publish() → Outbox → BI/Analytics/Accounting
  │
  └── [si aplica] → CommunicationClientService.notifyEvent()
                          │
                          ▼
            CommunicationConnectionService
            .getCommunicationConnectionForContext(type, businessId?)
                          │
                          ▼
            POST /notifications/event
            header: x-api-key: <token resuelto>
            body:   { companyId, event, email, payload }
                          │
                          ▼
                    Communications Platform
                    (resuelve TODO lo demás)
```

**Verificación en código:**

- `CommunicationClientService.notifyEvent()` es el **único método que construye y envía la request** a Communications.
- Hay exactamente **9 llamadas** a `notifyEvent()` en el codebase, todas vía `this.commClient.notifyEvent()`.
- Las 9 pasan por el mismo servicio: `CommunicationClientService`.
- No existe ningún módulo que llame a Communications directamente por HTTP.

El flujo es único. No hay rutas alternativas. ✅

---

## Pregunta 3: ¿Existe un único catálogo?

**Respuesta: Sí en diseño. Aún no existe en código (pendiente Sprint 6).**

El catálogo está formalmente definido en:
- `ADR-019-seed-catalog.md` — decisión arquitectónica
- `communication-architecture.md §6` — estructura y reglas
- `provisioning-default-templates.md` — tabla target

La regla es clara: existe exactamente un archivo (`seed-catalog.ts`) con el constante `COMMUNICATION_CATALOG`. No hay lugar para otro catálogo, otra lista, otro enum.

**Estado actual:** No hay Business Events implementados aún. El catálogo no existe porque no hace falta. Se crea en Sprint 6 antes de Billing.

**Riesgo si no se crea a tiempo:** Un desarrollador de Sprint 6 podría intentar llamar `notifyEvent('billing.invoice_sent', ...)` sin crear el catálogo primero, lo que fallaría silenciosamente (Communications no tendría ese evento configurado para el Business). El DoD §9 lo previene proceduralmente.

**Veredicto:** Único en diseño. ✅ Implementación pendiente, sin impacto hasta Sprint 6.

---

## Pregunta 4: ¿Existe un único resolver?

**Respuesta: Sí — sin excepciones.**

```
CommunicationConnectionService
  .getCommunicationConnectionForContext(type, businessId?)
```

**Verificación:**
- Este método es el único lugar donde se busca la `CommunicationConnection` y se descifra el token.
- `CommunicationClientService.notifyEvent()` lo llama directamente en la línea 72.
- Ningún otro módulo importa `CommunicationConnectionService` para resolver tokens.
- Ningún módulo accede al modelo `IntegrationConnection` directamente para obtener tokens.

Solo hay un resolver. ✅

---

## Pregunta 5: ¿Existe un único notifyEvent?

**Respuesta: Sí.**

```
CommunicationClientService.notifyEvent()
```

Esta es la única función que:
1. Llama al resolver
2. Construye el body de la request
3. Envía `POST /notifications/event`
4. Loggea el resultado

**Verificación:**
- No existe ningún otro método en ningún otro servicio que llame a `POST /notifications/event` directamente.
- No existe ningún `HttpService` importado en módulos de dominio (Customer, Company, Business, etc.).
- El único `HttpService` en la capa de aplicación está en `CommunicationClientService` y `CommunicationConnectionService`.

Solo hay un `notifyEvent`. ✅

---

## Pregunta 6: ¿Existe una única responsabilidad por capa?

**Respuesta: Sí — con una excepción documentada.**

### Tabla de responsabilidades

| Capa | Responsabilidad | ¿Se respeta? |
|---|---|---|
| **Frontend** | Toast/Snackbar de feedback inmediato para el usuario | ✅ |
| **Application Service** | Decide cuándo/qué/a quién/platform-business/payload | ✅ |
| **CommunicationClientService** | Único punto de salida hacia Communications | ✅ |
| **CommunicationConnectionService** | Único resolver de tokens | ✅ |
| **Domain Events / Outbox** | Integración interna con BI, Analytics, Accounting, Audit | ✅ |
| **Communications** | Provider, template, render, credenciales, entrega, logs | ✅ |

### La excepción documentada: `testSmtp()` en CompanyPortalService

`CompanyPortalService.testSmtp()` importa `nodemailer` y llama `transporter.verify()` para verificar que una configuración SMTP es alcanzable. **Esto no es entrega de notificaciones** — es verificación de conectividad.

```typescript
// company-portal.service.ts — solo verificación de conexión, nunca sendMail()
await transporter.verify();   // ← verifica que el host/puerto/auth sean válidos
// NO existe ningún transporter.sendMail() en Business App
```

Esta función es equivalente a un `ping`. No viola la arquitectura porque no envía nada a nadie.

**Acción para evitar confusión futura:** El método está documentado como "config verification only". El comentario en el código dice explícitamente que "the real sending always goes through `CommunicationClientService.notifyEvent()`".

Responsabilidades únicas por capa. ✅

---

## Pregunta 7: ¿Existe alguna ambigüedad?

**Respuesta: Dos ambigüedades menores. Ninguna rompe la arquitectura.**

### Ambigüedad A — `type: 'company'` vs `type: 'business'`

El código usa `type: 'platform' | 'company'`. La documentación y los ejemplos usan `type: 'platform' | 'business'`. Son sinónimos pero la inconsistencia existe.

**Impacto:** Un desarrollador que lee el código ve `'company'`. Un desarrollador que lee los documentos ve `'business'`. Si sigue el documento y escribe `type: 'business'`, TypeScript fallará con un error de tipo (el valor no es aceptado por la interfaz).

**Severidad:** Baja — TypeScript detecta el error en el momento de compilación.

**Resolución:** Deuda técnica documentada. Se resuelve en un sprint de refactor sin urgencia.

### Ambigüedad B — `event` es `string` sin validación de formato

El campo `event` en `NotifyEventParams` es `string`. No hay enforcement de:
- Que el formato sea `dominio.evento`
- Que el eventKey exista en el catálogo
- Que el dominio sea válido

```typescript
// Esto compila sin errores — aunque 'billing.invoice_sent' no exista en el catálogo:
this.commClient.notifyEvent({ event: 'billing.invoice_sent', ... })

// Esto también compila — aunque es incorrecto:
this.commClient.notifyEvent({ event: 'invoice_sent', ... })
this.commClient.notifyEvent({ event: 'BILLING.Invoice_Sent', ... })
```

En todos los casos, Communications retorna un error (evento no encontrado) que se loggea como `FAILED` — el flujo de negocio no falla pero la notificación nunca se entrega.

**Impacto:** Fallo silencioso en delivery. El DoD §9 lo previene proceduralmente. El log lo hace observable.

**Severidad:** Baja-media — detectable en el primer test de integración.

---

## Pregunta 8: ¿Existe algún punto donde un desarrollador pueda interpretar diferente la arquitectura?

**Respuesta: Dos puntos de interpretación posible.**

### Punto 1 — Platform vs Business para nuevos módulos de seguridad

**Escenario:** El módulo de HR quiere enviar una "invitación al portal HR" a un nuevo empleado.

**Interpretación A:** "Es una invitación del sistema → debería ser Platform."  
**Interpretación B:** "La empresa gestiona sus propios empleados → debería ser Business."

**Respuesta correcta:** Business. La regla es:
- Platform = el sistema (Invoice App / Grapifly) gestiona la acción, independiente de qué empresa sea
- Business = la empresa del tenant gestiona la acción hacia sus propias personas

Un empleado invitado al portal HR de una empresa específica usa las credenciales de ESA empresa. Si esa empresa no tiene token configurado, el email no se envía (comportamiento correcto — el negocio del tenant no funciona sin su propia configuración).

**Contra-ejemplo:** La invitación al sistema de Business App (crear cuenta de usuario en la plataforma) sigue siendo Platform, porque la plataforma gestiona la autenticación.

**Regla para resolver la ambigüedad:**
> ¿Quién es el "sender" conceptual del email? Si es Invoice App / Grapifly → Platform. Si es la empresa del tenant → Business.

### Punto 2 — ¿Qué hacer cuando `notifyEvent()` falla?

Actualmente todas las llamadas a `notifyEvent()` son fire-and-forget: el flujo de negocio nunca falla si Communications no entrega.

**Interpretación posible:** "Si la factura se envió pero el email no llegó, ¿debo reintentar desde Business App?"

**Respuesta correcta:** No. Communications es el dueño de los logs, retries, y delivery tracking. Business App solo sabe que `notifyEvent()` retornó `false` (lo loggea). El operador verifica en Communications' delivery logs. Si Communications tiene retry logic, lo maneja internamente.

**Acción:** Esta regla está documentada en `communication-architecture.md §11` pero podría ser más explícita en el DoD.

---

## Pregunta 9: ¿Qué deberíamos mejorar antes de Billing?

**Tres ítems — en orden de prioridad.**

### P1 — Crear `seed-catalog.ts` antes de Sprint 6 (Alta)

El catálogo no existe. Crear un archivo vacío-pero-tipado antes de que Billing comience garantiza que:
- El desarrollador de Billing ve el archivo y sabe que debe agregarlo
- No puede llamar `notifyEvent()` "esperando que funcione solo"
- TypeScript puede ayudar si se tipan los eventKeys (ver P3)

Mínimo necesario: crear el archivo con la estructura tipada y el array vacío.

```typescript
// seed-catalog.ts — crear este archivo antes de Sprint 6
export const COMMUNICATION_CATALOG: CatalogDomain[] = [
  // Sprint 6: agregar billing domain aquí antes de implementar InvoiceService
];
```

### P2 — Agregar nota explícita al DoD sobre fallo silencioso de notifyEvent() (Media)

El DoD §9 cubre "¿el eventKey existe en el catálogo?" pero no cubre "¿qué hacer cuando la entrega falla en producción?". Agregar una línea:

```
[ ] Si notifyEvent() puede retornar false: el flujo de negocio continúa.
    Communications es el dueño de retries y delivery tracking.
    Business App no implementa retry logic para Communications.
```

### P3 — Considerar eventKey tipado (Opcional — antes de Billing o después)

Es posible agregar type-safety a los eventKeys sin romper nada:

```typescript
// communication-catalog-keys.ts (generado o manual)
export const PLATFORM_EVENT_KEYS = [
  'security.company_verify_email',
  'security.company_forgot_password',
  // ...
] as const;

export const BUSINESS_EVENT_KEYS = [] as const; // Sprint 6+

export type EventKey =
  | typeof PLATFORM_EVENT_KEYS[number]
  | typeof BUSINESS_EVENT_KEYS[number];

// En NotifyEventParams:
event: EventKey;  // en lugar de string
```

Esto convierte la Ambigüedad B en un error de compilación. Es opcional pero de alto valor. No bloquea Sprint 3.

---

## Simulación de módulos futuros — protocolo de implementación

Para confirmar que ninguno requiere cambio arquitectónico, se verificó el protocolo de cada uno:

### Billing — Sprint 6

```
1. Crear seed-catalog.ts
2. Agregar domain 'billing' + events:
   - billing.invoice_sent   (requiredVars: invoiceNumber, amount, dueDate, customerName)
   - billing.invoice_overdue (requiredVars: invoiceNumber, daysOverdue, customerName)
   - billing.payment_received (requiredVars: invoiceNumber, amount, customerName)
3. Implementar SeedProvisioningService (pushea catálogo cuando Business guarda token)
4. En InvoiceService.send():
   this.commClient.notifyEvent({
     type: 'company', companyId: actor.businessId,
     event: 'billing.invoice_sent', email: customer.email,
     data: { invoiceNumber, amount, dueDate, customerName, viewUrl }
   })
5. Aplicar DoD §9 ✓
→ Ningún cambio arquitectónico requerido.
```

### Documents — Sprint 9

```
1. Agregar domain 'documents' al seed-catalog.ts existente
2. Agregar event: documents.document_shared
3. En DocumentService.share():
   this.commClient.notifyEvent({ type: 'company', event: 'documents.document_shared', ... })
→ Ningún cambio arquitectónico requerido.
```

### HR (futuro)

```
1. Agregar domain 'hr' al seed-catalog.ts
2. Agregar events: hr.offer_sent, hr.payslip_ready
3. En HRService.sendOffer(): notifyEvent({ type: 'company', event: 'hr.offer_sent', ... })
   (type = 'company' porque la empresa gestiona sus propios empleados)
→ Ningún cambio arquitectónico requerido.
```

### CRM, Inventory, Work, Assets, Scheduling, Maintenance

Todos siguen el mismo protocolo: agregar dominio al catálogo, implementar `notifyEvent({ type: 'company', ... })`. Sin cambio arquitectónico. ✅

---

## Resumen ejecutivo

| Pregunta | Respuesta |
|---|---|
| ✔ ¿La arquitectura puede soportar cualquier módulo futuro? | **Sí** — 9 módulos simulados, 0 cambios arquitectónicos requeridos |
| ✔ ¿Existe un único flujo? | **Sí** — verificado en código: 9 llamadas a `notifyEvent()`, todas vía el mismo servicio |
| ✔ ¿Existe un único catálogo? | **Sí** — `seed-catalog.ts` (pendiente Sprint 6; no hace falta antes) |
| ✔ ¿Existe un único resolver? | **Sí** — `getCommunicationConnectionForContext()` en `CommunicationConnectionService` |
| ✔ ¿Existe un único notifyEvent? | **Sí** — `CommunicationClientService.notifyEvent()` |
| ✔ ¿Existe una única responsabilidad por capa? | **Sí** — con excepción documentada (`testSmtp()` = verificación, no entrega) |
| ✔ ¿Existe alguna ambigüedad? | **Dos menores** — naming `'company'` vs `'business'`; `event` sin type-safety |
| ✔ ¿Existe algún punto de interpretación diferente? | **Dos** — Platform vs Business para modules de seguridad ajenos; retry policy |
| ✔ ¿Qué mejorar antes de Billing? | Crear `seed-catalog.ts` vacío-tipado + nota DoD sobre retry; tipado opcional |

---

## Conclusión

**La arquitectura quedó cerrada.**

Los siguientes módulos solo deberán seguir el estándar existente:

1. Aplicar las 5 preguntas del Communication First Decision
2. Si es Business Event: agregar al `COMMUNICATION_CATALOG` antes de implementar `notifyEvent()`
3. Si es Platform Event: agregar al `default-events.constant.ts` en Communications
4. Llamar `this.commClient.notifyEvent({ type, companyId, event, email, data })`
5. Completar el Communication Checklist del DoD §9

No se requiere ningún cambio en:
- `CommunicationClientService`
- `CommunicationConnectionService`
- `NotifyEventParams`
- `getCommunicationConnectionForContext()`
- La pipeline de Communications

La única tarea pendiente antes de Sprint 6 (Billing) es crear `seed-catalog.ts` e implementar `SeedProvisioningService`. Ambas son extensiones del sistema actual, no cambios arquitectónicos.
