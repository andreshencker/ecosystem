# 03 — Business Lifecycles

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

El ciclo de vida de un concepto describe los estados por los que puede pasar a lo largo de su existencia, las transiciones válidas entre esos estados, y los hechos de negocio que disparan cada transición. Una transición no documentada aquí no es una transición válida.

**Convenciones:**
- Los estados están en minúsculas
- Las transiciones indican qué evento o acción las dispara
- Los estados terminales están marcados con `[terminal]`
- Los estados inmutables están marcados con `[inmutable desde aquí]`

---

## BUSINESS

```
REGISTERED
  │  [cuando el User completa el registro]
  ▼
VERIFYING
  │  [el User confirma su email]
  ▼
ACTIVE
  │  [el Business Owner suspende la cuenta]
  ├──────────────────────────────────────►  SUSPENDED
  │                                              │  [el Business Owner reactiva]
  │◄─────────────────────────────────────────────┘
  │  [el Business Owner cancela definitivamente]
  ▼
ARCHIVED [terminal]
```

**Reglas de cada estado:**
- `registered`: el Business existe pero no puede emitir Invoices (falta verificación)
- `verifying`: el email fue enviado; las funciones están bloqueadas excepto reenviar verificación
- `active`: todas las funciones disponibles según el plan
- `suspended`: no puede operar, pero los datos se conservan; puede reactivarse
- `archived`: datos retenidos por 30 días para exportación, luego eliminados definitivamente

---

## USER

```
INVITED
  │  [el User acepta la invitación y establece contraseña]
  ▼
PENDING_VERIFICATION
  │  [el User verifica su email]
  ▼
ACTIVE
  │  [el Business Owner o Admin desactiva al User]
  ├──────────────────────────────────────►  DEACTIVATED
  │                                              │  [el Business Owner reactiva]
  │◄─────────────────────────────────────────────┘
  │  [el Business Owner elimina definitivamente]
  ▼
DELETED [terminal]
```

**Nota especial — Business Owner:**
El User con role `business_owner` no puede ser desactivado mientras sea el único `business_owner` del Business. Primero debe transferir el ownership a otro User.

---

## CUSTOMER

```
DRAFT (creado pero incompleto)
  │  [se completan los datos mínimos: nombre, contacto]
  ▼
ACTIVE
  │  [el Business decide no trabajar más con este Customer]
  ├──────────────────────────────────────►  INACTIVE
  │                                              │  [el Business reactiva la relación]
  │◄─────────────────────────────────────────────┘
  │  [el Business elimina el Customer]
  │  [solo si no tiene Contracts activos ni Invoices no pagadas]
  ▼
ARCHIVED [terminal]
```

**Restricción importante:**
Un Customer no puede pasar a `inactive` ni a `archived` si tiene:
- Contratos en estado `active`
- Invoices en estado `sent`, `viewed`, `partial`, u `overdue`

---

## CONTRACT

```
DRAFT
  │  [el Business completa los términos y activa el contrato]
  ▼
ACTIVE
  │  [el trabajo finaliza o el período termina]
  ├──────────────────────────────────────►  COMPLETED
  │                                         [terminal — no recibe nuevos WorkEvents]
  │
  │  [el contrato se cancela antes de completar el trabajo]
  └──────────────────────────────────────►  CANCELLED
                                            [terminal]
```

**Sobre ACTIVE:**
Un Contract en `active` puede tener Rates agregadas, removidas (deprecadas), o modificadas — mientras no afecte retroactivamente WorkEvents ya confirmados.

**Transición especial:** Si un Contract `active` tiene todos sus WorkEvents facturados y no hay trabajo pendiente, puede marcarse como `completed` manualmente.

---

## RATE

```
DRAFT
  │  [se activa junto con el Contract]
  ▼
ACTIVE
  │  [se crea una Rate nueva que la reemplaza]
  ├──────────────────────────────────────►  SUPERSEDED
  │                                         [terminal — los datos históricos la siguen referenciando]
  │
  │  [el Contract se cancela o completa]
  └──────────────────────────────────────►  ARCHIVED
                                            [terminal]
```

**Inmutabilidad histórica:**
Una Rate en `superseded` no se elimina. Los WorkEvents históricos que la usaron siguen referenciándola para garantizar que el monto calculado no cambia retroactivamente.

---

## WORK EVENT

```
DRAFT
  │  [el User o el calendario importa el evento]
  │
  │  ┌─── IMPORTADO (de Calendar) vs MANUAL ───┐
  │  │                                          │
  │  ▼                                          │
  │  (revisión del usuario)                     │
  │                                             │
  │  [el User confirma el WorkEvent]            │
  │◄────────────────────────────────────────────┘
  ▼
CONFIRMED [billable]
  │  [el Business incluye el WorkEvent en una Invoice]
  ▼
INVOICED
  │  [la Invoice es anulada — el WorkEvent vuelve al estado previo]
  ├──────────────────────────────────────►  CONFIRMED (revertido)
  │
  │  [el Payment es recibido y la Invoice queda paid]
  ▼
PAID [inmutable desde aquí para el WorkEvent]
  │
  │  [archivado al cierre del período fiscal]
  ▼
ARCHIVED [terminal]

[En cualquier estado antes de INVOICED]:
  │  [el User invalida el WorkEvent]
  ▼
VOID [terminal]
```

**La transición INVOICED → CONFIRMED:**
Solo ocurre cuando la Invoice que contenía al WorkEvent es anulada (voided). Es la única transición hacia atrás permitida en el sistema.

---

## CALENDAR INTEGRATION

```
CONNECTING
  │  [el Usuario completa el OAuth flow]
  ▼
ACTIVE
  │  [el token expira o es revocado por el proveedor]
  ├──────────────────────────────────────►  NEEDS_REAUTH
  │                                              │  [el Usuario completa el OAuth de nuevo]
  │◄─────────────────────────────────────────────┘
  │
  │  [el Usuario pausa la sincronización]
  ├──────────────────────────────────────►  SUSPENDED
  │                                              │  [el Usuario reactiva]
  │◄─────────────────────────────────────────────┘
  │
  │  [el Usuario desconecta la integración]
  ▼
REVOKED [terminal]
```

---

## INVOICE

```
DRAFT
  │  [el Business Owner revisa y envía]
  ▼
SENT
  │  [el Customer abre el email/link de la Invoice]
  ├──────────────────────────────────────►  VIEWED (tracking — opcional)
  │◄─────────────────────────────────────────┘ [no cambia el flujo]
  │
  │  [se registra un Payment parcial]
  ├──────────────────────────────────────►  PARTIAL
  │◄─────────────────────────────────────────┘ [si el Payment se revierte]
  │
  │  [la fecha de vencimiento pasa sin pago total]
  │  (automático — job diario)
  ├──────────────────────────────────────►  OVERDUE
  │◄─────────────────────────────────────────┘ [si se recibe un Payment que la saca de overdue]
  │
  │  [el Payment(s) cubren el total]
  ▼
PAID [inmutable desde aquí]
  │
  │  [archivada al cierre del período fiscal]
  ▼
ARCHIVED [terminal]

[Desde DRAFT, SENT, VIEWED, PARTIAL, OVERDUE]:
  │  [el Business Owner anula la Invoice]
  ▼
VOIDED [terminal — los WorkEvents incluidos vuelven a CONFIRMED]

[Solo desde DRAFT]:
  │  [el Business Owner descarta el borrador]
  ▼
CANCELLED [terminal]
```

**El estado VOIDED es terminal para la Invoice:**
No puede reactivarse. Si se necesita volver a facturar los mismos WorkEvents, se crea una nueva Invoice.

---

## PAYMENT

```
RECORDED
  │  [la validación del pago es completada]
  ▼
CLEARED
  │  [el pago es conciliado con el extracto bancario]
  ▼
RECONCILED [estable]
  │
  │  [el Business detecta que el pago fue erróneo — chargeback, NSF, etc.]
  ▼
REVERSED [terminal]
```

**REVERSED genera un nuevo registro:**
Cuando un Payment es revertido, no se modifica el registro original. Se crea un nuevo PaymentReversal (una nueva FinancialTransaction de tipo PAYMENT_REVERSED). El estado del Payment original pasa a `reversed`.

---

## FINANCIAL TRANSACTION

```
PENDING
  │  [el Accounting Engine procesa la transacción exitosamente]
  ▼
POSTED [inmutable — el JournalEntry fue creado] [terminal para este ciclo]

[Desde PENDING]:
  │  [el período fiscal está cerrado, o falta PostingRule, o hay error]
  ▼
REJECTED [terminal — requiere intervención manual]

[Para corregir una transacción POSTED]:
  │  [se crea una nueva FinancialTransaction de tipo reversal]
  ▼
REVERSED (la original permanece POSTED; la nueva es POSTED también)
```

**La FinancialTransaction nunca se modifica:**
La corrección siempre es aditiva — una nueva transacción de reversión. El trail de auditoría es siempre completo.

---

## JOURNAL ENTRY

```
(JournalEntry nace directamente en POSTED)
POSTED [inmutable desde el nacimiento] [terminal]

Para corregir:
  Nueva JournalEntry de reversión → POSTED
  La original permanece intacta en el libro mayor
```

---

## FISCAL PERIOD

```
OPEN
  │  [el Business Owner o Accountant cierra el período]
  │  [requiere que no haya FinancialTransactions en estado PENDING]
  ▼
CLOSED [puede reabrirse si hay un error — requiere confirmación del Business Owner]
  │  [el período es bloqueado definitivamente para auditoría]
  ▼
LOCKED [terminal — ninguna acción puede modificarlo]
  │
  │  [archivado después de 7 años]
  ▼
ARCHIVED [terminal]
```

**La diferencia entre CLOSED y LOCKED:**
- `closed`: no acepta nuevas transacciones, pero puede reabrirse si se descubre un error
- `locked`: definitivamente cerrado, visible pero nunca modificable, incluso para el contador

---

## DOCUMENT

```
DRAFT (en generación)
  │  [el binario es cargado al storage provider exitosamente]
  ▼
ACTIVE
  │  [se genera una nueva versión del mismo documento]
  ├──────────────────────────────────────►  ACTIVE (nueva versión, misma entidad)
  │
  │  [el período al que pertenece es archivado, o han pasado N años]
  ▼
ARCHIVED
  │  [han pasado los años de retención mínima legal]
  ▼
DELETED [terminal — el binario es eliminado; el tombstone permanece]
```

---

## WORKFLOW EXECUTION

```
PENDING
  │  [el motor inicia la ejecución]
  ▼
RUNNING
  │  [un step es un Delay]
  ├──────────────────────────────────────►  WAITING
  │◄─────────────────────────────────────────┘ [el Delay expira]
  │
  │  [todos los steps completan]
  ▼
COMPLETED [terminal]

[Desde RUNNING o WAITING]:
  │  [un step falla y agota los reintentos]
  ▼
FAILED [terminal — va a Dead Letter Queue]

[Desde RUNNING, WAITING]:
  │  [el Business Owner o Platform Admin cancela]
  ▼
CANCELLED [terminal]

[Desde RUNNING]:
  │  [el timeout máximo del workflow es superado]
  ▼
TIMED_OUT [terminal]
```

---

## INTEGRATION CONNECTION

```
CONNECTING
  │  [OAuth flow completado o API Key validada]
  ▼
ACTIVE
  │  [el token expira / es revocado por el proveedor]
  ├──────────────────────────────────────►  NEEDS_REAUTH
  │                                              │  [el Usuario completa la reconexión]
  │◄─────────────────────────────────────────────┘
  │
  │  [N errores consecutivos en health check]
  ├──────────────────────────────────────►  ERROR
  │◄─────────────────────────────────────────┘ [health check exitoso]
  │
  │  [el Usuario pausa la integración]
  ├──────────────────────────────────────►  SUSPENDED
  │◄─────────────────────────────────────────┘ [el Usuario reactiva]
  │
  │  [el Usuario desconecta]
  ▼
REVOKED [terminal]
```

---

## Resumen de transiciones prohibidas

Estas transiciones nunca ocurren, independientemente de las circunstancias:

| Concepto | Transición prohibida | Razón |
|---|---|---|
| Invoice PAID | → cualquier estado anterior | Los hechos de pago son irreversibles; se crea una FinancialTransaction de reversión |
| JournalEntry POSTED | → cualquier modificación | La inmutabilidad contable es absoluta |
| FinancialTransaction POSTED | → modificación | Se crea una transacción de reversión |
| FiscalPeriod LOCKED | → OPEN | El bloqueo definitivo no tiene vuelta atrás |
| WorkEvent VOID | → CONFIRMED o INVOICED | El void es terminal |
| Document DELETED | → ACTIVE | La eliminación es irreversible (el tombstone permanece) |
| Rate SUPERSEDED | → ACTIVE | Las Rates históricas nunca se reactivan |
