# 12 — Open Questions

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Pendiente de decisión

Este documento reúne todas las preguntas de diseño que no tienen respuesta definitiva todavía. No se responden aquí — se documentan para que se decidan antes de la fase de implementación correspondiente.

Cada pregunta tiene:
- El contexto del problema
- Las opciones identificadas
- La fase en la que debe decidirse
- El riesgo si se decide tarde

---

## Q-001 — ¿Se renombra companyId a businessId? *(ADR-001)*

> **✅ RESUELTA — ADR-001 + ADR-007**

**Decisión:** Opción A — migración completa a `businessId` en todos los schemas, colecciones, JWT y AuthContext. Ver ADR-001 para el plan detallado en 4 fases.

---

## Q-002 — ¿Un Business puede tener múltiples FiscalProfiles?

> **✅ RESUELTA — ADR-007**

**Decisión:** Opción A — 1:1 en v1. Un Business tiene exactamente un FiscalProfile. La extensión a 1:N es compatible con este diseño si hay demanda futura.

---

## Q-003 — ¿Un User puede pertenecer a múltiples Businesses?

> **✅ RESUELTA — ADR-007**

**Decisión:** Opción A — un User, un Business en v1. El JWT mantiene `businessId` como campo singular. La extensión futura (multi-Business) es compatible sin migrar schemas de base de datos.

---

## Q-004 — ¿Customer puede ser persona natural?

**Contexto:** El campo `Customer.type: 'company' | 'individual'` está en el diseño. Un "individual" no tiene ABN, puede no tener empresa, y su identificación puede ser un TFN o solo nombre. El flujo de facturación para individuos puede requerir campos distintos.

**Opciones:**
- A: Soportar `type: 'individual'` desde Fase 1. Los campos específicos de empresa (ABN) son opcionales.
- B: Solo `type: 'company'` en v1. Agregar individuals en el futuro como extensión.

**Fase para decidir:** Fase 1

**Riesgo si se decide tarde:** Si se asume que todos los Customers son empresas y luego se agrega `individual`, puede requerir migrar documentos existentes.

---

## Q-005 — ¿Un WorkEvent puede tener múltiples Rates?

**Contexto:** El diseño actual propone `workEvent.rateId` — una sola Rate. Sin embargo, un turno de 10 horas puede tener las primeras 8 a tarifa estándar y las últimas 2 a overtime. ¿Cómo se modela esto?

**Opciones:**
- A: Un WorkEvent, una Rate. Para el overtime, crear un segundo WorkEvent del mismo día para las 2 horas de overtime.
- B: `workEvent.rateSegments[]`: cada segmento tiene `{startTime, endTime, rateId}`. El `calculatedAmount` es la suma de segmentos.
- C: `rateOverrideAmount`: si se aplica una tarifa mixta, el usuario provee el monto final manualmente.

**Fase para decidir:** Fase 3

**Riesgo si se decide tarde:** Si se implementa con una sola Rate y luego se necesita el modelo de segmentos, requiere un cambio de schema + migración.

---

## Q-006 — ¿Cómo se manejan los breaks?

**Contexto:** El diseño tiene `WorkEvent.breakMinutes`. ¿Es un descanso fijo (unpaid break) o puede ser más complejo?

**Opciones:**
- A: Un solo `breakMinutes` numérico. Simple, cubre el 90% de los casos.
- B: Múltiples breaks: `breaks: [{ startTime, endTime }]`. Cada break puede ser pagado o no pagado.
- C: Break por política: el contrato define la regla de breaks (ej. "30 min por cada 5 horas trabajadas").

**Fase para decidir:** Fase 3

**Riesgo si se decide tarde:** Si se implementa el modelo simple y luego se necesita breaks complejos, requiere refactor de `WorkEventCalculationService`.

---

## Q-007 — ¿Cómo se manejan los public holidays?

**Contexto:** En Australia, los public holidays tienen fechas que varían por estado. Un WorkEvent en un public holiday debería aplicar la Rate de public holiday automáticamente, pero ¿el sistema detecta automáticamente los holidays o el usuario los declara?

**Opciones:**
- A: Manual. El usuario marca el WorkEvent como `type: 'public_holiday'`. El sistema aplica la Rate de public holiday si existe.
- B: Semi-automático. El sistema tiene un calendario de public holidays por estado de Australia y sugiere el tipo cuando detecta que la fecha es feriado.
- C: Automático. El sistema aplica automáticamente la Rate de public holiday en días detectados como feriados.

**Fase para decidir:** Fase 3

**Riesgo si se decide tarde:** El `WorkEventType` enum y `RateResolutionService` deben saber si necesitan acceso a un calendario de feriados.

---

## Q-008 — ¿Un Payment puede cubrir múltiples Invoices?

**Contexto:** Un Customer puede hacer una transferencia bancaria por el total de varias Invoices pendientes en un solo pago. El diseño actual tiene `Payment.invoiceId` (singular). ¿Se soporta uno-a-muchos?

**Opciones:**
- A: Un Payment = una Invoice. Para pagos que cubren varias, crear un Payment por Invoice.
- B: Un Payment puede distribuirse: `Payment.allocations: [{ invoiceId, amount }]`. El total del Payment es la suma de allocations.
- C: Payment genérico + PaymentAllocation: el Payment es un documento de fondo y luego se asigna a una o más Invoices mediante `PaymentAllocation`.

**Fase para decidir:** Fase 5

**Riesgo si se decide tarde:** Si se implementa 1:1 y el Business necesita manejar pagos combinados, requiere migrar el schema de Payment.

---

## Q-009 — ¿Cómo se maneja el crédito al Customer?

**Contexto:** Si un Customer ha pagado de más (Payment > Invoice.total), o si se emitió una nota de crédito, ¿dónde se registra ese crédito y cómo se aplica a futuras Invoices?

**Opciones:**
- A: No soportar crédito en v1. El monto excedente se devuelve fuera del sistema.
- B: `CreditNote` como entidad nueva que puede aplicarse a Invoices futuras del mismo Customer.
- C: `Customer.creditBalance`: el exceso de Payments se acumula como crédito disponible y se descuenta automáticamente de la próxima Invoice.

**Fase para decidir:** Fase 5 o posterior

---

## Q-010 — ¿Se soportan múltiples monedas?

**Contexto:** El diseño actual tiene `Business.defaultCurrency` y `FiscalProfile` asume AUD. Un freelancer puede trabajar para clientes en el Reino Unido y facturar en GBP.

**Opciones:**
- A: Una sola moneda por Business en v1. Todos los WorkEvents e Invoices usan `defaultCurrency`.
- B: Una moneda por Contract. El Business puede tener Contracts en distintas monedas.
- C: Una moneda por Invoice. Total libertad de moneda por factura.

**Fase para decidir:** Fase 2 (afecta el diseño de Contract y Rate)

**Riesgo si se decide tarde:** Si se implementa moneda única y luego se necesita multi-moneda, el tipo `Money` debe cambiar en todas las entidades.

---

## Q-011 — ¿Cuándo se genera una Invoice automáticamente?

**Contexto:** El diseño contempla que el usuario selecciona WorkEvents y genera la Invoice manualmente. Pero el Contract tiene un `billingCycle`. ¿Se usa el billingCycle para auto-generar Invoices?

**Opciones:**
- A: Solo manual. El usuario siempre genera la Invoice explícitamente.
- B: Auto-draft al final del ciclo. El sistema crea un borrador automáticamente que el usuario aprueba antes de enviar.
- C: Auto-sent al final del ciclo. El sistema genera y envía automáticamente sin intervención.

**Fase para decidir:** Fase 4

**Riesgo si se decide tarde:** Afecta si se necesita implementar un job periódico de generación de Invoices.

---

## Q-012 — ¿CalendarIntegration es por User o por Business?

**Contexto:** El diseño actual propone `CalendarIntegration.userId` — cada usuario conecta su propio Google Calendar. Un Business Admin podría tener su propio Google Calendar donde registra los turnos de todo el equipo. ¿O hay un calendario centralizado del Business?

**Opciones:**
- A: Por User. Cada usuario conecta su calendario personal. Los WorkEvents importados son propios de ese usuario.
- B: Por Business. El Business Owner conecta un calendario central y todos los WorkEvents son asignables a cualquier User del Business.
- C: Ambos. Un usuario puede conectar su calendario personal Y el Business puede tener un calendario central.

**Fase para decidir:** Fase 3

---

## Q-013 — ¿GST inclusivo o exclusivo en la tarifa?

**Contexto:** En Australia, las tarifas pueden cotizarse con GST incluido (el cliente paga $110 y el Business le debe $10 a impuestos) o sin GST (el cliente paga $100 + $10 GST = $110 en la factura). ¿Cómo se define la Rate?

**Opciones:**
- A: Rate siempre sin GST. La Invoice agrega el GST encima. El campo `InvoiceItem.taxable` determina si aplica GST.
- B: Rate puede ser "GST inclusive". El sistema calcula el componente de GST.

**Fase para decidir:** Fase 2 (afecta RateAmount VO e InvoiceCalculationService)

---

## Q-014 — ¿CompanySmtp queda obsoleto?

> **✅ RESUELTA — ADR-007**

**Decisión:** Opción A — eliminar en Fase 0. No hay ningún consumer activo de CompanySmtp. Todos los emails pasan por CommunicationConnection → Communications Platform. Ver ADR-007 para el scope completo de la eliminación.

---

## Q-015 — ¿Cómo se maneja el GST en facturas a clientes sin ABN?

**Contexto:** En Australia, si el Customer es una empresa sin ABN, hay reglas especiales sobre retención de impuestos. ¿Invoice App las soporta?

**Opciones:**
- A: No en v1. El sistema genera la factura con el GST calculado y el Business decide si aplica la retención manualmente.
- B: El sistema detecta ausencia de ABN en el Customer y advierte al Business.
- C: El sistema calcula automáticamente la retención (withholding tax) según las reglas del ATO.

**Fase para decidir:** Fase 4

---

## Resumen de preguntas por fase de decisión

| Pregunta | Tema | Fase | Estado |
|---|---|---|---|
| Q-001 | companyId → businessId (ADR-001) | Fase 0 | ✅ Resuelta |
| Q-002 | ¿Múltiples FiscalProfiles? | Fase 0 | ✅ Resuelta |
| Q-003 | ¿User en múltiples Businesses? | Fase 0 | ✅ Resuelta |
| Q-014 | ¿CompanySmtp obsoleto? | Fase 0 | ✅ Resuelta |
| Q-004 | ¿Customer individual? | Fase 1 |
| Q-010 | ¿Multi-moneda? | Fase 2 |
| Q-013 | ¿GST inclusivo/exclusivo en Rate? | Fase 2 |
| Q-005 | ¿WorkEvent con múltiples Rates? | Fase 3 |
| Q-006 | ¿Cómo se modelan los breaks? | Fase 3 |
| Q-007 | ¿Detección de public holidays? | Fase 3 |
| Q-012 | ¿CalendarIntegration por User o Business? | Fase 3 |
| Q-011 | ¿Invoice automática o manual? | Fase 4 |
| Q-015 | ¿GST para Customer sin ABN? | Fase 4 |
| Q-008 | ¿Payment cubre múltiples Invoices? | Fase 5 |
| Q-009 | ¿Crédito al Customer? | Fase 5+ |
