# 09 — Architecture Principles

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial — Reglas inquebrantables

Este documento contiene los principios arquitectónicos no negociables del ERP. Cada regla tiene una justificación, una consecuencia de violarla, un ejemplo correcto, y un anti-ejemplo.

Una Pull Request que viola cualquiera de estas reglas debe ser rechazada, independientemente de la urgencia o la presión del sprint.

---

## PRINCIPIO 1 — Billing nunca escribe en Journal ni en Ledger

**Regla:** El módulo de Billing no tiene acceso de escritura a ninguna entidad del Accounting domain (Journal, JournalEntry, GeneralLedger, Account, ChartOfAccounts).

**Justificación:** La integridad del libro mayor depende de que solo el Accounting Engine pueda escribir en él. Si Billing pudiera escribir directamente, un bug en Billing podría crear asientos contables incorrectos o descuadrados que comprometen la posición financiera reportada.

**Consecuencia de violar:** Asientos desbalanceados, contabilidad incorrecta, imposibilidad de auditoría independiente, P&L incorrecto.

**Ejemplo correcto:**
```
BillingService.sendInvoice(id)
    → invoice.status = 'sent'
    → events.publish(InvoiceSent { ... })
    // Billing termina aquí. No sabe lo que pasa después.

FinancialTransactionFactory.onInvoiceSent(event)
    → crea FinancialTransaction(INVOICE_ISSUED)
    → AccountingEngine.process(transaction)
    → crea JournalEntry con DR/CR correctos
```

**Anti-ejemplo:**
```
// PROHIBIDO — Billing no puede hacer esto
BillingService.sendInvoice(id) {
    await this.ledger.debit('1100', invoice.total);    // ← VIOLACIÓN
    await this.ledger.credit('4000', invoice.netAmount);
}
```

---

## PRINCIPIO 2 — Accounting nunca modifica Invoice

**Regla:** El dominio de Accounting no puede modificar ninguna entidad de Billing (Invoice, InvoiceItem, Payment).

**Justificación:** Accounting es un consumidor de hechos financieros. No produce hechos. Si Accounting pudiera modificar facturas, el estado de Billing dependería del estado de Accounting, creando acoplamiento bidireccional.

**Consecuencia de violar:** Billing necesita importar Accounting, ciclo de dependencias, sistema imposible de desplegar de forma independiente.

**Ejemplo correcto:**
```
TransactionPosted event publicado por Accounting
    → Analytics lee el evento y actualiza sus Read Models
    // Accounting no toca nada de Billing
```

**Anti-ejemplo:**
```
// PROHIBIDO — Accounting no puede hacer esto
AccountingEngine.process(tx) {
    const invoice = await this.invoiceRepo.findById(tx.referenceId);
    invoice.accountingStatus = 'posted';   // ← VIOLACIÓN
    await this.invoiceRepo.save(invoice);
}
```

---

## PRINCIPIO 3 — FinancialTransaction es el único contrato entre negocio y contabilidad

**Regla:** Toda información que fluya del mundo operativo hacia Accounting debe hacerlo exclusivamente a través de una `FinancialTransaction` normalizada. No existe ningún otro canal.

**Justificación:** La FinancialTransaction es la frontera que permite que ambos lados evolucionen de forma independiente. Si Billing pudiera llamar directamente al AccountingEngine con parámetros ad-hoc, un cambio en la interfaz de Accounting rompería Billing.

**Consecuencia de violar:** Acoplamiento directo entre dominios, imposibilidad de cambiar las reglas contables sin modificar módulos operativos.

**Ejemplo correcto:**
```
InvoiceSent → FinancialTransaction(INVOICE_ISSUED, ...)
PaymentRecorded → FinancialTransaction(PAYMENT_RECEIVED, ...)
ExpenseApproved → FinancialTransaction(EXPENSE_RECORDED, ...)

AccountingEngine.process(FinancialTransaction)
    // El engine no sabe si vino de Billing o de Expenses
```

**Anti-ejemplo:**
```
// PROHIBIDO — llamada directa con parámetros de Billing
AccountingEngine.postInvoice(invoiceId, customerId, amount, gst) // ← VIOLACIÓN
```

---

## PRINCIPIO 4 — Communications nunca conoce Accounting

**Regla:** El sistema de Communications no tiene dependencia de ningún tipo con el dominio de Accounting, Financial, ni con conceptos contables.

**Justificación:** Communications es responsable de entregar mensajes. No necesita saber nada del libro mayor para entregar un email de factura. Si Communications conociera Accounting, un cambio en el modelo contable podría romper el sistema de comunicaciones.

**Consecuencia de violar:** Communications debe desplegarse cuando cambia Accounting, acoplamiento innecesario, fragilidad del sistema de comunicaciones.

**Ejemplo correcto:**
```
InvoiceSent event
    → Communication domain consume el evento
    → Extrae: recipientEmail, invoiceNumber, amount, dueDate
    → Llama a Communications Platform API
    // No sabe nada de asientos, cuentas, ni GST
```

**Anti-ejemplo:**
```
// PROHIBIDO — Communications consultando Accounting
CommunicationService.sendInvoiceEmail(invoiceId) {
    const entry = await this.journalRepo.findByInvoiceId(invoiceId); // ← VIOLACIÓN
    const gstAmount = entry.lines.find(l => l.accountCode === '2200').amount;
}
```

---

## PRINCIPIO 5 — Analytics nunca modifica datos

**Regla:** El dominio de Analytics tiene acceso de solo lectura absoluto. No puede modificar ninguna entidad de ningún otro dominio.

**Justificación:** Analytics es una capa de observación. Si pudiera modificar datos, mezclaría lógica de negocio con lógica de reporting, haciendo ambas imposibles de entender de forma aislada.

**Consecuencia de violar:** Reportes que tienen efectos secundarios, bugs de reporting que corrompen datos operacionales.

**Ejemplo correcto:**
```
Analytics construye WorkloadAnalysisView desde Domain Events
    → Solo lee eventos históricos
    → Construye proyecciones
    → Expone Read Models vía API
    // Nunca escribe en work_events, invoices, ni journal_entries
```

**Anti-ejemplo:**
```
// PROHIBIDO — Analytics marcando WorkEvents como procesados
AnalyticsEngine.processWorkEvents() {
    for (const event of events) {
        event.analyticsProcessed = true;  // ← VIOLACIÓN
        await this.workEventRepo.save(event);
    }
}
```

---

## PRINCIPIO 6 — Calendar nunca genera facturas

**Regla:** El dominio de Calendar no puede crear Invoices, InvoiceItems, ni PaymentRecords. Su única salida es `CalendarEventImported`, que crea WorkEvents draft.

**Justificación:** El calendario es una fuente de tiempo. La decisión de convertir tiempo en factura pertenece al Business Owner, no al proceso de sincronización del calendario.

**Consecuencia de violar:** Facturas generadas automáticamente sin revisión humana, errores de cálculo automáticamente facturados.

**Ejemplo correcto:**
```
CalendarSyncService.sync()
    → Crea WorkEvent(draft) para cada evento importado
    → Publica CalendarEventImported
    // Work domain maneja el draft. El usuario decide cuándo confirmar.
    // Billing decide cuándo facturar. Calendar no decide nada de esto.
```

**Anti-ejemplo:**
```
// PROHIBIDO — Calendar generando Invoices
CalendarSyncService.sync() {
    for (const event of googleEvents) {
        const invoice = await this.billingService.createInvoice(event); // ← VIOLACIÓN
    }
}
```

---

## PRINCIPIO 7 — Business nunca conoce Posting Rules

**Regla:** El dominio de Business (y sus entidades: Business, FiscalProfile) no tiene dependencia con PostingRules ni con ningún concepto del Financial o Accounting domain.

**Justificación:** El Business Owner no es contador. Sabe su ABN y su cuenta bancaria. No sabe qué cuenta contable corresponde a sus ingresos. Si Business dependiera de Accounting para crearse, ningún Business podría existir sin un Chart of Accounts.

**Consecuencia de violar:** Imposible crear un Business sin configuración contable previa, acoplamiento que bloquea el onboarding.

**Ejemplo correcto:**
```
Business se crea con: businessName, jurisdiction, currency
    → BusinessCreated event publicado
    → Accounting (independientemente) inicializa el Chart of Accounts
    // Business no sabe que Accounting existe
```

**Anti-ejemplo:**
```
// PROHIBIDO — Business eligiendo sus propias Posting Rules
BusinessService.create(dto) {
    const rule = await this.postingRuleRepo.findDefault(dto.jurisdiction); // ← VIOLACIÓN
    business.defaultPostingRuleId = rule.id;
}
```

---

## PRINCIPIO 8 — Toda query de negocio incluye businessId

**Regla:** Ninguna query sobre entidades de negocio puede omitir `businessId` en el filtro. Un `findAll()` sin `businessId` en producción es una violación de seguridad.

**Justificación:** Multi-tenancy. Sin este filtro, un bug puede exponer datos de otro Business.

**Consecuencia de violar:** Data breach, mezcla de datos entre tenants, consecuencias legales.

**Ejemplo correcto:**
```
// Toda query de negocio
Invoice.find({ businessId: authContext.businessId, status: 'sent' })
WorkEvent.find({ businessId: authContext.businessId, date: { $gte: startDate } })
```

**Anti-ejemplo:**
```
// PROHIBIDO — query sin businessId
Invoice.find({ status: 'overdue' })  // ← VIOLACIÓN — retorna facturas de TODOS los Businesses
WorkEvent.find({ userId: userId })   // ← VIOLACIÓN — podría retornar WorkEvents de otro Business
```

---

## PRINCIPIO 9 — JournalEntry es inmutable

**Regla:** Una vez que un JournalEntry tiene `status: 'posted'`, no puede modificarse ni eliminarse. Para corregir un asiento erróneo, se crea un asiento de reversión.

**Justificación:** La partida doble contable requiere un trail de auditoría completo. Los auditores deben poder ver exactamente qué ocurrió, cuándo, y por qué. Si los asientos pudieran modificarse, el libro mayor no sería confiable.

**Consecuencia de violar:** Auditorías fallidas, General Ledger no confiable, pérdida de evidencia de transacciones.

**Ejemplo correcto:**
```
// Error detectado en InvoiceSent
InvoiceVoided event publicado
    → FinancialTransaction(INVOICE_VOIDED) creada
    → AccountingEngine genera JournalEntry de reversión:
        DR: Revenue         $100
        DR: GST Liability    $10
        CR: Accounts Receivable $110
    // El asiento original permanece. El trail es completo.
```

**Anti-ejemplo:**
```
// PROHIBIDO — modificar un JournalEntry existente
JournalEntry.findByIdAndUpdate(id, { $set: { 'lines.0.amount': 50 } }) // ← VIOLACIÓN
JournalEntry.findByIdAndDelete(id)  // ← VIOLACIÓN
```

---

## PRINCIPIO 10 — Un Domain Event describe lo que ocurrió, no lo que debe ocurrir

**Regla:** Los Domain Events se nombran en tiempo pasado (`InvoiceSent`, no `SendInvoice`). Describen hechos consumados. No son comandos.

**Justificación:** Un evento es un hecho del pasado — inmutable. Un comando es una instrucción para el futuro — puede fallar. Mezclarlos crea ambigüedad sobre si el sistema debe reaccionar o si ya reaccionó.

**Consecuencia de violar:** Sistemas de eventos que no saben si son un hecho o una instrucción, retries de efectos ya aplicados, violación de idempotencia.

**Ejemplo correcto:**
```
Domain Event: InvoiceSent        // ocurrió en el pasado
Domain Event: PaymentRecorded    // ocurrió en el pasado
Domain Event: WorkEventConfirmed // ocurrió en el pasado
```

**Anti-ejemplo:**
```
// PROHIBIDO — eventos como comandos
Domain Event: SendInvoice        // ← instrucción, no hecho
Domain Event: ProcessPayment     // ← instrucción, no hecho
Domain Event: ConfirmWorkEvent   // ← instrucción, no hecho
```

---

## PRINCIPIO 11 — Los módulos de dominio no se conocen entre sí directamente

**Regla:** Un Bounded Context no importa clases, servicios, ni repositorios de otro Bounded Context. La comunicación entre contextos es solo a través de Domain Events o contratos publicados (interfaces).

**Justificación:** El acoplamiento directo entre módulos hace que un cambio en uno requiera cambios en todos los que dependen de él. La independencia de despliegue es imposible con acoplamiento directo.

**Consecuencia de violar:** Cambio en cascada — modificar un campo en WorkEvent rompe Billing que importó WorkEvent directamente.

**Ejemplo correcto:**
```
// Billing solo conoce el ID del WorkEvent (referencia)
InvoiceItem.workEventId: ObjectId

// Si Billing necesita datos del WorkEvent, los obtiene
// del payload del Domain Event o de un Read Model publicado
```

**Anti-ejemplo:**
```
// PROHIBIDO — Billing importando directamente del módulo Work
import { WorkEventService } from '../work/work-event.service'; // ← VIOLACIÓN
import { WorkEvent } from '../work/schemas/work-event.schema'; // ← VIOLACIÓN
```

---

## PRINCIPIO 12 — Las reglas contables viven en datos, no en código

**Regla:** Las Posting Rules (cómo transformar una FinancialTransaction en asientos contables) son registros de base de datos configurables, no condicionales `if/switch` en código.

**Justificación:** Las leyes fiscales cambian. Un nuevo país requiere nuevas reglas. Si las reglas contables están en código, cada cambio fiscal requiere un deploy. Si están en datos, el Platform Admin puede configurarlas sin deploy.

**Consecuencia de violar:** Deploy necesario para cada cambio de tasa fiscal, imposibilidad de soportar múltiples jurisdicciones simultáneamente.

**Ejemplo correcto:**
```
PostingRule en base de datos:
  { type: 'INVOICE_ISSUED', jurisdiction: 'AU', effectiveFrom: '2026-07-01', lines: [...] }
  { type: 'INVOICE_ISSUED', jurisdiction: 'NZ', effectiveFrom: '2026-07-01', lines: [...] }

AccountingEngine lee la regla correspondiente en runtime.
```

**Anti-ejemplo:**
```
// PROHIBIDO — reglas en código
if (jurisdiction === 'AU') {
    await ledger.debit('1100', amount);  // ← VIOLACIÓN
    await ledger.credit('4000', net);
    await ledger.credit('2200', tax);
} else if (jurisdiction === 'NZ') {
    // más código hardcoded...
}
```

---

## Resumen de principios

| # | Principio | En una frase |
|---|---|---|
| P1 | Billing no escribe en Journal | La contabilidad es responsabilidad del Accounting Engine |
| P2 | Accounting no modifica Invoice | Accounting solo observa, nunca actúa sobre el operativo |
| P3 | FinancialTransaction es el único contrato | El único puente entre operaciones y contabilidad |
| P4 | Communications no conoce Accounting | El mensajero no conoce el libro mayor |
| P5 | Analytics no modifica datos | Reporting es observación pura |
| P6 | Calendar no genera facturas | El calendario provee tiempo, no dinero |
| P7 | Business no conoce Posting Rules | El dueño del negocio no es contador |
| P8 | Toda query incluye businessId | Multi-tenancy no es opcional |
| P9 | JournalEntry es inmutable | Los hechos contables del pasado no se borran |
| P10 | Events describen hechos, no instrucciones | Pasado, no futuro |
| P11 | Módulos no se importan entre sí | El acoplamiento directo es deuda técnica |
| P12 | Reglas contables en datos, no en código | La configuración es más flexible que el código |
