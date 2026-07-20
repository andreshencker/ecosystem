# 09 — Recognition Policy

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial — Decisión de alto impacto contable

Este documento resuelve la Pregunta Abierta **PO-REV-001**: ¿cuándo se reconoce el ingreso? Y lo hace con una respuesta arquitectónica, no contable: **la política de reconocimiento es configuración del Financial domain, no lógica de Revenue ni de Billing**.

---

## El problema

En la versión inicial de `05-financial-impact.md`, la decisión estaba hardcodeada: "el ingreso se reconoce cuando la Invoice es enviada". Esta decisión, aunque correcta como comportamiento por defecto, viola un principio de diseño importante:

> Revenue y Billing no deben saber cuándo se crea la FinancialTransaction.

Si Revenue o Billing saben cuándo se reconoce el ingreso, entonces:
- Cambiar de Invoice-Basis a Cash-Basis requiere modificar código en Billing
- Un Business en Australia (que usa Invoice-Basis) y un Business en EEUU (que puede usar Cash-Basis) necesitarían código diferente en el mismo módulo
- La política contable queda entrelazada con la lógica de facturación

La solución correcta es que Revenue y Billing emitan hechos económicos crudos, y que la Recognition Policy (configuración del Financial domain) decida qué FinancialTransactions crear y cuándo.

---

## La Recognition Policy

Una Recognition Policy es la configuración que define, para un Business específico y una jurisdicción dada, qué evento del ciclo de ingreso dispara la creación de cada FinancialTransaction.

Es el mismo principio que las PostingRules (ADR-005): en lugar de hardcodear los asientos contables en el código, son datos de configuración que el Financial Engine aplica en tiempo de ejecución.

```
Revenue y Billing publican:
  RevenueEarned       (al confirmar el trabajo)
  InvoiceIssued       (al enviar la Invoice)
  PaymentReceived     (al registrar el pago)

Recognition Policy mapea:
  Para INVOICE_BASIS:  InvoiceIssued      → crear FT de tipo INVOICE_ISSUED
  Para CASH_BASIS:     PaymentReceived    → crear FT de tipo REVENUE_AND_PAYMENT
  Para ACCRUAL:        RevenueEarned      → crear FT de tipo REVENUE_ACCRUED
                       InvoiceIssued      → crear FT de tipo AR_RECLASSIFIED
                       PaymentReceived    → crear FT de tipo PAYMENT_RECEIVED

Financial Engine:
  Consulta la RecognitionPolicy del Business
  Aplica el mapping
  Crea la FinancialTransaction correspondiente
```

---

## Las tres políticas

### INVOICE_BASIS — Por defecto en v1

**Descripción:** El ingreso se reconoce cuando la Invoice es enviada al Customer. Es el método más común para freelancers, contractors, y pequeñas empresas en Australia, Nueva Zelanda, Canadá, y Reino Unido.

**Cuándo aplica:** Siempre que el negocio use contabilidad por lo devengado basada en documentos emitidos.

**Flujo de FinancialTransactions:**

```
Invoice.Sent
    │
    ▼
FT: INVOICE_ISSUED
  DR: Accounts Receivable  $110 (total inc. GST)
  CR: Revenue               $100 (neto)
  CR: GST Collected          $10

Payment.Received
    │
    ▼
FT: PAYMENT_RECEIVED
  DR: Bank Account         $110
  CR: Accounts Receivable  $110

Ciclo: la deuda nace con la Invoice y se cancela con el Pago.
```

**Lo que Revenue emite:** `RevenueEarned`, `InvoiceIssued` (no sabe que generará un FT)
**Lo que Financial Engine decide:** "Para INVOICE_BASIS, el evento `InvoiceIssued` genera FT tipo INVOICE_ISSUED"

---

### CASH_BASIS

**Descripción:** El ingreso se reconoce cuando el dinero llega. No se registra AR — el Revenue y el Pago son el mismo hecho económico. Usado por negocios pequeños que priorizan simplicidad contable o que lo requieren por su jurisdicción fiscal.

**Cuándo aplica:** Negocios muy pequeños, ciertos sectores regulados, jurisdicciones que lo permiten para empresas bajo un umbral de ingresos.

**Flujo de FinancialTransactions:**

```
Invoice.Sent
    │
    ▼
(Sin FT — solo un evento operativo. La Invoice existe pero no tiene consecuencia contable todavía)

Payment.Received
    │
    ▼
FT: REVENUE_AND_PAYMENT
  DR: Bank Account        $110
  CR: Revenue              $100 (neto)
  CR: GST Collected         $10

Ciclo: solo existe un hecho económico — cuando el dinero entra.
```

**Implicación de negocio:** El Balance Sheet no muestra Accounts Receivable — el dinero no está "devengado" hasta que llega.

---

### ACCRUAL_STRICT — Para empresas con GAAP/IFRS

**Descripción:** El ingreso se reconoce cuando el trabajo que lo genera se completa — es decir, cuando el WorkEvent es confirmado. La Invoice formaliza la deuda pero no crea el ingreso (ya fue reconocido). Es el método requerido para empresas con obligaciones de reporting GAAP o IFRS.

**Cuándo aplica:** Empresas medianas/grandes, empresas con inversores, subsidiarias de empresas cotizadas.

**Flujo de FinancialTransactions:**

```
WorkEvent.Confirmed → RevenueEarned publicado
    │
    ▼
FT: REVENUE_ACCRUED
  DR: Unbilled Accounts Receivable  $100 (estimado neto)
  CR: Revenue                        $100

Invoice.Sent → InvoiceIssued publicado
    │
    ▼
FT: AR_RECLASSIFIED
  DR: Accounts Receivable            $110 (ahora incluye GST)
  CR: Unbilled Accounts Receivable   $100
  CR: GST Collected                   $10

Payment.Received
    │
    ▼
FT: PAYMENT_RECEIVED
  DR: Bank Account         $110
  CR: Accounts Receivable  $110

Ciclo: el ingreso nace con el trabajo, la deuda se formaliza con la Invoice, y el AR se cancela con el Pago.
```

**Implicación para el Balance Sheet:** El Balance Sheet muestra "Unbilled AR" desde que se confirma el trabajo — no solo desde que se envía la factura.

---

## El principio de separación

```
INCORRECTO (política en Billing):
  InvoiceSentHandler {
    if (business.accountingMethod === 'invoice_basis') {
      financialEngine.create(INVOICE_ISSUED, ...)
    } else if (business.accountingMethod === 'cash_basis') {
      // no hacer nada — esperar el pago
    }
  }
  ← Billing conoce la política contable. Cambiar la política requiere cambiar Billing.

CORRECTO (política como configuración):
  InvoiceSentHandler {
    eventBus.publish(InvoiceIssued { invoiceId, ... })
    // Fin. Billing no sabe qué pasará con este evento.
  }

  Financial Engine:
    RecognitionPolicy.forBusiness(businessId) → INVOICE_BASIS
    → Escucha: InvoiceIssued → crea FT: INVOICE_ISSUED
    
  Si el Business cambia a CASH_BASIS:
    → El Financial Engine deja de escuchar InvoiceIssued para FTs de ingreso
    → Empieza a escuchar PaymentReceived para FTs de ingreso
    → Cero cambios en Billing
```

---

## Eventos económicos que Revenue y Billing publican

Independientemente de la Recognition Policy activa, Revenue y Billing siempre publican estos eventos de hecho económico. El Financial Engine decide cuáles procesará según la política:

| Evento publicado | Dominio | Qué representa |
|---|---|---|
| `RevenueEarned` | Revenue (al confirmar un WorkEvent) | "Se generó valor económico por trabajo realizado" |
| `InvoiceIssued` | Billing (al enviar la Invoice) | "Existe un documento de deuda formal con el Customer" |
| `PaymentReceived` | Billing (al registrar un pago) | "El Customer entregó dinero" |
| `InvoiceVoided` | Billing (al anular) | "El documento de deuda fue cancelado" |
| `PaymentReversed` | Billing (al revertir) | "El pago fue anulado" |
| `CreditNoteIssued` | Billing | "El Business redujo parcialmente la deuda del Customer" |

Revenue y Billing publican estos eventos siempre. No saben si un evento específico generará una FinancialTransaction — eso es decisión de la RecognitionPolicy.

---

## La Recognition Policy como configuración del Financial domain

La Recognition Policy es una entidad de configuración del Financial domain, similar a las PostingRules:

```
RecognitionPolicy {
  businessId:   ID del Business
  policyType:   INVOICE_BASIS | CASH_BASIS | ACCRUAL_STRICT
  effectiveFrom: fecha desde la cual aplica esta política
  jurisdiction: AU | NZ | CA | UK | US (para políticas por jurisdicción)
}
```

**Cuándo puede cambiar:**
Un Business puede cambiar de política al inicio de un nuevo FiscalPeriod. No puede cambiar en medio de un período (rompería la coherencia contable del período). El cambio requiere aprobación del Business Owner con confirmación explícita.

**Política por defecto:**
Todo Business nuevo se crea con `policyType: INVOICE_BASIS`. Si no hay RecognitionPolicy configurada, el Financial Engine usa INVOICE_BASIS como fallback.

---

## Impacto en la Matriz de Impacto Financiero (05-financial-impact.md)

La Matriz de Impacto Financiero debe leerse como: "qué eventos son hechos económicos" — no como "qué eventos crean FinancialTransactions en todos los casos". La creación de FinancialTransactions depende de la RecognitionPolicy activa.

**Corrección al documento `05-financial-impact.md`:**
El evento `Invoice.Sent` sigue siendo un hecho económico ✅ — pero bajo CASH_BASIS, no generará directamente una FT. El hecho económico ocurrió; la Recognition Policy decide si registrarlo en ese momento.

La columna "FinancialTransaction" en la Matriz debe interpretarse como "¿es este un hecho económico que PUEDE generar una FT?" — no como "¿siempre genera una FT al ocurrir?".

---

## Decisión arquitectónica

**DEC-REC-001 — Recognition Policy como configuración del Financial domain:**
La política de reconocimiento de ingresos es configuración del Financial domain, no lógica de Revenue ni de Billing. Revenue y Billing publican eventos de hecho económico. El Financial Engine consulta la RecognitionPolicy del Business para decidir qué FinancialTransaction crear y cuándo.

**DEC-REC-002 — INVOICE_BASIS como política por defecto en v1:**
Todo Business nuevo usa INVOICE_BASIS como política de reconocimiento. Esta es la política más común en los mercados objetivo (AU, NZ, CA) y la más simple de auditar.

**DEC-REC-003 — Cambio de política solo al inicio de FiscalPeriod:**
Un Business no puede cambiar de Recognition Policy en medio de un período fiscal. El cambio efectúa al inicio del siguiente período, documentado en el audit log.

**DEC-REC-004 — Revenue y Billing son agnósticos a la política:**
Ningún componente de Revenue ni de Billing tiene lógica condicional sobre la política contable. Publican los hechos económicos y dejan que la RecognitionPolicy determine las consecuencias contables.
