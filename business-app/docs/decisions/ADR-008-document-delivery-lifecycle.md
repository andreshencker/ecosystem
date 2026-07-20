# ADR-008: Document Delivery Lifecycle — Flujo canónico de generación y entrega documental

**Fecha:** 2026-07-05
**Estado:** Aceptado
**Autor:** Architecture Review Session

---

## Contexto

El ERP necesita un flujo canónico para generar documentos (PDFs de facturas, estados de cuenta, reportes, etc.) y entregarlos al destinatario. Este flujo involucra cuatro dominios: Billing/Revenue (origina el evento), Document Platform (genera el PDF), Analytics (provee los datos), y Communications (envía el email).

Sin un flujo definido, cada dominio podría asumir responsabilidades que no le corresponden:

- Billing podría generar el PDF directamente
- Analytics podría construir emails con los datos que provee
- Communications podría consultar entidades para obtener datos del cliente
- Document Platform podría almacenar los PDFs generados

Cada una de esas asunciones viola las fronteras de los Bounded Contexts y crea acoplamiento indirecto.

---

## Decisiones

### 1. El trigger es un Domain Event de negocio, no una llamada directa

Billing/Revenue publica `InvoiceApproved`. Document Platform suscribe y orquesta el flujo documental de forma autónoma. Billing no llama directamente al Document Platform ni sabe que existe.

**Razón:** Consistente con ADR-002 (event-driven integration). Permite agregar futuros consumidores de `InvoiceApproved` sin modificar Billing.

### 2. El PDF se genera de forma efímera — TTL 15 minutos

El PDF generado se almacena en un buffer temporal con TTL de 15 minutos. Después de ese tiempo, se destruye automáticamente. El Document Platform nunca almacena PDFs permanentemente.

**Razón:** Los PDFs de facturas son documentos del dominio legal-financiero. Si deben persistirse para el portal del cliente o para auditoría, eso es una decisión explícita de Billing/Revenue que se modela como una llamada separada a Document Management (fuera del flujo de entrega). El flujo de entrega por email no requiere persistencia.

### 3. Analytics provee datasets completos, nunca campos individuales

Document Platform solicita a Analytics los datasets declarados en el `DocumentContract` para el tipo de documento correspondiente. Analytics responde con los datasets completos. Nunca se solicitan campos individuales.

**Razón:** Los datasets completos permiten que los templates/bloques usen cualquier campo sin requerir cambios en el Contract. Los campos son responsabilidad del template, no del Contract.

### 4. El recipientEmail viaja de Analytics a Document Platform a Communications

El email del cliente se extrae del `CustomerDataset` en el momento de generación del documento y se incluye en el evento `DocumentRendered`. Communications no necesita resolver el email desde otro sistema.

**Razón:** Analytics ya tiene el `CustomerDataset` completo en la respuesta. Reutilizarlo evita una segunda llamada de Communications a Customer data y mantiene Communications completamente pasivo (solo necesita enviar, no resolver).

### 5. Communications mapea entityType a emailEventKey internamente

Document Platform no incluye `emailEventKey` en `DocumentRendered`. Communications conoce internamente el mapeo `entityType: 'invoice'` → `emailEventKey: 'invoices.invoice_sent'`.

**Razón:** Document Platform no debe saber nada sobre la estructura del sistema de comunicaciones. La responsabilidad del mapping pertenece a Communications.

### 6. El estado del Invoice solo cambia en Billing/Revenue

Billing/Revenue actualiza `Invoice.status → 'sent'` al recibir `EmailSent`. Ningún otro dominio modifica el estado del Invoice.

**Razón:** El estado del Invoice es parte del agregado de Billing/Revenue. Solo el productor del agregado puede mutarlo. Mantener esto garantiza consistencia y evita actualizaciones concurrentes desde múltiples dominios.

### 7. Los reintentos de email son internos a Communications

Communications reintenta el envío N veces antes de publicar `EmailFailed`. Billing/Revenue nunca ve los intentos intermedios — solo el resultado final.

**Razón:** La política de reintentos de email es un detalle operacional de Communications. Exponerla al sistema de negocio generaría ruido y complejidad innecesaria en Billing.

### 8. El correlationId fluye a través de todos los eventos

Cada evento del ciclo (InvoiceApproved, DocumentRendered, EmailSent, EmailFailed, InvoiceDelivered) lleva el mismo `correlationId`. El `documentExecutionId` identifica la ejecución específica del Document Platform.

**Razón:** Distributed tracing requiere un hilo conductor. Con `correlationId` se puede reconstruir el flujo completo de cualquier entrega desde el log de eventos.

---

## Consecuencias

### Positivas

- **Billing/Revenue no conoce Document Platform ni Communications** — puede desplegarse y testearse en aislamiento
- **Document Platform es intercambiable** — si mañana se cambia el renderer de PDF, ningún otro dominio cambia
- **Communications es stateless en el ciclo documental** — recibe buffer + metadata, envía, publica resultado
- **El flujo es el mismo para todos los tipos de documento** — Invoice, Statement, BAS, Payroll usan exactamente el mismo patrón
- **Sin almacenamiento de PDFs en el flujo de entrega** — simplifica compliance y lifecycle management
- **Audit trail completo** via correlationId + documentExecutionId

### Negativas / Trade-offs

- **Si el buffer expira antes de que Communications lo consuma**, el email no se puede enviar sin reiniciar el flujo (Billing/Revenue debe republicar `InvoiceApproved`)
- **Consistencia eventual entre Invoice.status y la realidad del email** — hay un lag entre que el email se envía y que Invoice.status refleja 'sent'
- **Debugging distribuido** — un fallo puede ocurrir en cualquiera de los 4 dominios; se necesita distributed tracing completo

---

## Reglas de implementación

### R-01: Document Platform debe ser idempotente por invoiceId

Si `InvoiceApproved` se publica más de una vez para el mismo `invoiceId`, Document Platform genera el documento solo una vez. Deduplicación por `invoiceId` en el momento de recepción del evento.

### R-02: Communications debe ser idempotente por documentExecutionId

Si `DocumentRendered` se entrega más de una vez (at-least-once delivery), Communications envía el email solo una vez. Deduplicación por `documentExecutionId`.

### R-03: El buffer nunca se procesa después de bufferExpiresAt

Si Communications recibe `DocumentRendered` después de `bufferExpiresAt`, debe publicar `EmailFailed` con `reason: 'buffer_expired'` sin intentar procesar.

### R-04: Billing/Revenue actualiza Invoice.status solo hacia adelante

La máquina de estados del Invoice es forward-only: `approved → sent` o `approved → delivery_failed`. Un Invoice `sent` no puede volver a `approved`. Un Invoice `delivery_failed` puede reiniciar el flujo solo mediante acción explícita del Business Owner (publicando un nuevo evento).

### R-05: Todos los eventos llevan correlationId desde InvoiceApproved

El `correlationId` se genera en Billing/Revenue al publicar `InvoiceApproved` y se propaga sin modificación a través de todos los eventos del ciclo.

---

## Diagrama de responsabilidades

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RESPONSABILIDADES POR DOMINIO                      │
├──────────────────┬──────────────────────────────────────────────────────────┤
│ Billing/Revenue  │ Publica InvoiceApproved                                  │
│                  │ Suscribe EmailSent / EmailFailed                         │
│                  │ Actualiza Invoice.status                                  │
│                  │ Publica InvoiceDelivered / InvoiceDeliveryFailed         │
│                  │ Dispara recordatorios de pago (flujo separado)           │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ Document         │ Suscribe InvoiceApproved                                 │
│ Platform         │ Resuelve BusinessDocumentPackage y DocumentContract      │
│                  │ Solicita datasets a Analytics                            │
│                  │ Resuelve locale y format                                 │
│                  │ Renderiza PDF (efímero, TTL 15 min)                      │
│                  │ Publica DocumentRendered                                 │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ Analytics        │ Recibe solicitud de datasets                             │
│                  │ Retorna datasets completos                               │
│                  │ Suscribe InvoiceDelivered (para métricas)               │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ Communications   │ Suscribe DocumentRendered                                │
│                  │ Fetch buffer (bufferRef)                                 │
│                  │ Compone email (via emailEventKey mapping interno)        │
│                  │ Adjunta PDF buffer                                       │
│                  │ Envía via proveedor (con reintentos internos)            │
│                  │ Publica EmailSent / EmailFailed                          │
├──────────────────┼──────────────────────────────────────────────────────────┤
│ Audit/Timeline   │ Suscribe EmailSent, EmailFailed, InvoiceDelivered        │
│                  │ Registra entradas en el timeline del Invoice             │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

---

## Documentos relacionados

- `docs/domain/document-management/04-document-lifecycle.md` — Flujo detallado con contratos y catálogo de eventos
- `ADR-002-event-driven-integration.md` — Patrón canónico de integración entre dominios
- `ADR-003-financial-transaction-bridge.md` — Modelo de integración Billing ↔ Accounting
