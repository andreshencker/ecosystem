# 11 — Revenue Timeline

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

El Revenue Timeline es el registro cronológico oficial de todos los eventos significativos en el ciclo de vida de una Invoice — desde que se confirma el primer WorkEvent hasta que el ingreso queda registrado en el libro contable. Es la fuente de verdad del "qué ocurrió y cuándo" para cualquier ciclo de facturación.

---

## Qué es el Timeline

El Timeline no es un log técnico. Es el relato de negocio del ciclo de ingreso: la secuencia de hechos que el Business Owner puede ver en su portal para saber en qué estado está cada Invoice y qué pasó con cada WorkEvent.

Hay dos tipos de eventos en el Timeline:

```
EVENTO DE TIMELINE:
  Visible en el portal del Business Owner.
  Tiene una descripción legible por humanos.
  Forma parte del audit trail del ciclo.
  Ejemplo: "WorkEvent agregado al período", "Invoice enviada al Customer"

EVENTO FINANCIERO:
  Subconjunto de los eventos de Timeline que además generan FinancialTransaction.
  Son los hechos económicos formales.
  Ejemplo: "Invoice enviada" (genera INVOICE_ISSUED)
           "Pago registrado" (genera PAYMENT_RECEIVED)
```

Un evento puede ser simultáneamente de Timeline y Financiero. La distinción importa porque:
- Los eventos de Timeline son para el Business Owner (UI)
- Los eventos Financieros son para el Accounting Engine (libro mayor)

---

## El Timeline completo

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 1 — GENERACIÓN DE TRABAJO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T-01  WorkEvent Created             [Timeline]
      "Se registró el turno del [fecha]"
      Dominio: Work

T-02  WorkEvent Imported             [Timeline]
      "Turno importado desde Google Calendar"
      Dominio: Work / Calendar

T-03  RateCalculation Created        [Timeline] [Analytics]
      "Valor calculado: $[amount]"
      Dominio: Work (Rate Engine)

T-04  WorkEvent Confirmed            [Timeline] [Analytics]
      "Turno confirmado — $[amount] pendiente de facturar"
      Dominio: Work

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 2 — ACUMULACIÓN EN REVENUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T-05  Revenue Draft Updated          [Timeline] [Analytics]
      "Ingreso del período actualizado: $[newTotal]"
      Dominio: Revenue

T-06  Billing Period Closed          [Timeline] [Analytics]
      "Período [fechas] cerrado — $[total] listo para facturar"
      Dominio: Revenue

T-07  Revenue Draft Transferred      [Timeline]
      "Período enviado a facturación"
      Dominio: Revenue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 3 — GENERACIÓN DE FACTURA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T-08  Invoice Draft Created          [Timeline]
      "Borrador de factura #[número] generado"
      Dominio: Billing

T-09  Invoice Draft Edited           [Timeline]
      "Borrador actualizado manualmente"
      Dominio: Billing (acción del Business Owner)

T-10  Invoice Approved               [Timeline] [Analytics]
      "Factura #[número] aprobada por [usuario]"
      Dominio: Billing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 4 — GENERACIÓN DEL DOCUMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T-11  Document Requested             [Timeline]
      "Generación del PDF de factura solicitada"
      Dominio: Billing → Document Management

T-12  Document Generated             [Timeline]
      "PDF de factura #[número] generado y almacenado"
      Dominio: Document Management

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 5 — ENVÍO AL CUSTOMER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T-13  Invoice Ready To Send          [Timeline]
      "Factura lista para envío"
      Dominio: Billing

T-14  ★ Invoice Sent                 [Timeline] [FINANCIERO] [Communication] [Analytics]
      "Factura #[número] enviada a [customer email]"
      Dominio: Billing
      → Genera: FinancialTransaction INVOICE_ISSUED (según RecognitionPolicy)
      → Genera: AR abierto por $[total]

T-15  Invoice Viewed                 [Timeline] [Analytics]
      "El Customer abrió la factura"
      Dominio: Billing (tracking)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 6 — GESTIÓN DE COBRO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T-16  Invoice Overdue                [Timeline] [Analytics]
      "Factura #[número] vencida — $[amountDue] pendiente"
      Dominio: Billing (job diario)

T-17  Reminder Sent                  [Timeline] [Communication] [Analytics]
      "Recordatorio de pago enviado al Customer"
      Dominio: Communications / Automation

T-18  ★ Payment Received (parcial)   [Timeline] [FINANCIERO] [Analytics]
      "Pago parcial registrado: $[amount] de $[total]"
      Dominio: Billing
      → Genera: FinancialTransaction PAYMENT_RECEIVED (parcial)

T-19  ★ Payment Received (total)     [Timeline] [FINANCIERO] [Analytics]
      "Pago total registrado: $[amount]"
      Dominio: Billing
      → Genera: FinancialTransaction PAYMENT_RECEIVED

T-20  Invoice Paid                   [Timeline] [Analytics]
      "Factura #[número] cobrada en su totalidad"
      Dominio: Billing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 7 — CICLO CERRADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T-21  JournalEntries Posted          [interno — no en Timeline del usuario]
      Dominio: Accounting Engine
      → El libro mayor refleja el ciclo completo

T-22  Analytics Updated              [interno — no en Timeline del usuario]
      Dominio: Analytics Engine
      → KPIs y Read Models actualizados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CASOS ESPECIALES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

T-23  Invoice Cancelled              [Timeline] [Analytics]
      "Borrador de factura cancelado"
      Dominio: Billing
      (solo si la Invoice nunca fue enviada — no genera FT)

T-24  ★ Invoice Voided               [Timeline] [FINANCIERO] [Analytics]
      "Factura #[número] anulada"
      Dominio: Billing
      → Genera: FinancialTransaction INVOICE_VOIDED (reversión de INVOICE_ISSUED)
      → WorkEvents incluidos vuelven a estado `confirmed`

T-25  ★ Payment Reversed             [Timeline] [FINANCIERO] [Analytics]
      "Pago revertido: $[amount]"
      Dominio: Billing
      → Genera: FinancialTransaction PAYMENT_REVERSED

T-26  ★ Credit Note Issued           [Timeline] [FINANCIERO] [Analytics]
      "Nota de crédito emitida: -$[amount]"
      Dominio: Billing
      → Genera: FinancialTransaction CREDIT_NOTE_ISSUED

T-27  WorkEvent Voided (pre-invoice) [Timeline] [Analytics]
      "Turno anulado y removido del borrador"
      Dominio: Work
      (solo si la Invoice Draft todavía no fue aprobada)
```

---

## Leyenda

```
★  [FINANCIERO]   Genera FinancialTransaction (según RecognitionPolicy activa)
   [Timeline]     Visible en el portal del Business Owner
   [Analytics]    Actualiza KPIs y Read Models
   [Communication] Involucra al Communications domain
```

---

## Tabla de clasificación

| # | Evento | Timeline | Financiero | Analytics | Comunicación |
|---|---|---|---|---|---|
| T-01 | WorkEvent Created | ✅ | ❌ | ❌ | ❌ |
| T-02 | WorkEvent Imported | ✅ | ❌ | ❌ | ❌ |
| T-03 | RateCalculation Created | ✅ | ❌ | ✅ | ❌ |
| T-04 | WorkEvent Confirmed | ✅ | ❌ | ✅ | ❌ |
| T-05 | Revenue Draft Updated | ✅ | ❌ | ✅ | ❌ |
| T-06 | Billing Period Closed | ✅ | ❌ | ✅ | ❌ |
| T-07 | Revenue Draft Transferred | ✅ | ❌ | ✅ | ❌ |
| T-08 | Invoice Draft Created | ✅ | ❌ | ❌ | ❌ |
| T-09 | Invoice Draft Edited | ✅ | ❌ | ❌ | ❌ |
| T-10 | Invoice Approved | ✅ | ❌ | ✅ | ❌ |
| T-11 | Document Requested | ✅ | ❌ | ❌ | ✅ |
| T-12 | Document Generated | ✅ | ❌ | ❌ | ✅ |
| T-13 | Invoice Ready To Send | ✅ | ❌ | ❌ | ✅ |
| **T-14** | **Invoice Sent** | **✅** | **★✅** | **✅** | **✅** |
| T-15 | Invoice Viewed | ✅ | ❌ | ✅ | ❌ |
| T-16 | Invoice Overdue | ✅ | ❌ | ✅ | ❌ |
| T-17 | Reminder Sent | ✅ | ❌ | ✅ | ✅ |
| **T-18** | **Payment Received (parcial)** | **✅** | **★✅** | **✅** | **❌** |
| **T-19** | **Payment Received (total)** | **✅** | **★✅** | **✅** | **❌** |
| T-20 | Invoice Paid | ✅ | ❌ | ✅ | ❌ |
| T-21 | JournalEntries Posted | ❌ | ❌ | ❌ | ❌ |
| T-22 | Analytics Updated | ❌ | ❌ | ❌ | ❌ |
| T-23 | Invoice Cancelled | ✅ | ❌ | ✅ | ❌ |
| **T-24** | **Invoice Voided** | **✅** | **★✅** | **✅** | **❌** |
| **T-25** | **Payment Reversed** | **✅** | **★✅** | **✅** | **❌** |
| **T-26** | **Credit Note Issued** | **✅** | **★✅** | **✅** | **✅** |
| T-27 | WorkEvent Voided (pre-invoice) | ✅ | ❌ | ✅ | ❌ |

**★ = sujeto a RecognitionPolicy activa del Business**

---

## Los 6 eventos financieros

Solo estos 6 eventos del Timeline generan FinancialTransactions (dependiendo de la RecognitionPolicy):

| Evento | FT generada | Asiento (referencia) |
|---|---|---|
| Invoice Sent | `INVOICE_ISSUED` | DR: AR / CR: Revenue + GST |
| Payment Received | `PAYMENT_RECEIVED` | DR: Bank / CR: AR |
| Invoice Voided | `INVOICE_VOIDED` | Reversal de INVOICE_ISSUED |
| Payment Reversed | `PAYMENT_REVERSED` | Reversal de PAYMENT_RECEIVED |
| Credit Note Issued | `CREDIT_NOTE_ISSUED` | DR: Revenue / CR: AR |
| (Accrual only) WorkEvent Confirmed | `REVENUE_ACCRUED` | DR: Unbilled AR / CR: Revenue |

---

## El Timeline en el portal del Business Owner

El Timeline visible en el portal muestra todos los eventos marcados como `[Timeline]`, en orden cronológico, con:
- La descripción legible en el idioma configurado
- El timestamp del evento
- El usuario o proceso que lo disparó (si aplica)
- El monto asociado (si aplica)
- Un indicador visual si el evento fue un hecho financiero

Esto da al Business Owner una respuesta clara a "¿qué pasó con esta factura?" sin necesidad de entender el modelo técnico.

---

## El Timeline como audit trail

Todo evento marcado como `[Timeline]` se almacena de forma inmutable en el Revenue/Billing audit trail. No puede modificarse ni eliminarse — solo puede extenderse con nuevos eventos.

Si un Business Owner necesita demostrar que la Invoice fue enviada en una fecha específica, el Timeline es la evidencia:
- T-14 (Invoice Sent) con timestamp `2026-07-05T14:23:05Z`
- T-12 (Document Generated) con timestamp `2026-07-05T14:23:00Z` (el PDF existía antes del envío)
- T-04 (WorkEvent Confirmed) con timestamp `2026-07-03T09:15:00Z` (el trabajo fue confirmado 2 días antes)

Esta cadena de evidencia es continua e inmutable.
