# 01 — Domain Overview

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

---

## ¿Qué es Invoice App?

Invoice App es un **ERP personal para freelancers, contractors y pequeñas empresas**. Su función central no es generar un PDF con un número de factura — es responder, en cualquier momento, la pregunta que todo trabajador independiente tiene en la cabeza:

> *¿Cuánto trabajé, para quién, a qué tarifa, y ya me pagaron?*

El nombre "Invoice App" describe solo la salida visible del sistema. Lo que resuelve internamente es mucho más amplio: registro de trabajo, contratación, tarifas, facturación y cobro — todo integrado en una sola herramienta que reemplaza una combinación de hojas de cálculo, calendarios, notas y emails.

---

## El problema que resuelve

### El trabajador independiente hoy

Un carpenter contractor, un makeup artist freelancer, o un consultor de tecnología autónomo enfrentan el mismo problema operativo:

1. **El trabajo ocurre** — un turno en J Production, una consultoría para Merivale, un proyecto para un cliente nuevo.
2. **El trabajo no se registra sistemáticamente** — se anota en el calendario de Google, en una hoja de Excel, en una nota de iPhone, o directamente en la memoria.
3. **Al final del mes hay que facturar** — y reconstruir el trabajo desde múltiples fuentes fragmentadas.
4. **La factura se genera manualmente** — Word, Excel, o un generador online de una sola vez.
5. **El cobro no tiene trazabilidad** — ¿cuándo se envió la factura? ¿cuándo venció? ¿la pagaron?

El resultado: tiempo perdido, errores de facturación, pagos tardíos, y pérdida de control financiero.

### Lo que Invoice App resuelve

| Problema | Solución |
|---|---|
| Registro fragmentado de trabajo | WorkEvents integrados con calendario |
| Sin visibilidad de tarifas por cliente | Rates por Contract |
| Facturación manual y laboriosa | Generación de Invoice desde WorkEvents confirmados |
| Sin trazabilidad de envíos | CommunicationLog + estado de Invoice |
| Cobros sin seguimiento | Payments vinculados a Invoices |
| Mezcla de configuración fiscal y datos de cliente | FiscalProfile separado del Business |

---

## Los actores del dominio

### Actores internos (usan la aplicación)

| Actor | Rol en el sistema | Alcance |
|---|---|---|
| **Platform Admin** | Opera la plataforma Invoice App como SaaS | Global — acceso a todos los Businesses |
| **Business Owner** | Propietario del negocio. Configura y controla todo. | Un Business |
| **Business Admin** | Gestión operativa diaria sin acciones destructivas | Un Business |
| **Accountant** | Acceso financiero: facturas, pagos, reportes, impuestos | Un Business |
| **Staff** | Registro de trabajo: WorkEvents, borradores | Un Business |
| **Viewer** | Solo lectura de información del Business | Un Business |

### Actores externos (no usan la aplicación directamente)

| Actor | Rol en el dominio |
|---|---|
| **Customer** | La empresa o persona que recibe facturas. No tiene acceso a la aplicación. |
| **Communications Platform** | Sistema externo que entrega los emails y mensajes generados por Invoice App |
| **Calendar Provider** | Google Calendar, Apple Calendar, Outlook — fuente de WorkEvents importados |
| **Bank** | Fuente de conciliación para Payments (fase futura) |

---

## Tipos de Business que usa Invoice App

Invoice App está diseñado para servir a tres perfiles distintos, aunque con el mismo modelo de dominio:

### Perfil 1 — Shift Worker / Gig Worker
Trabaja por turnos para múltiples empleadores. Cada turno tiene fecha, hora inicio, hora fin y tarifa. Al final del período factura las horas trabajadas.

**Ejemplo:** Carpenter, electrician, hospitality worker, security guard, nurse.

**Flujo dominante:** CalendarIntegration → WorkEvent → Invoice → Payment

### Perfil 2 — Freelancer / Contractor
Trabaja bajo contratos de mediano plazo con un cliente fijo o algunos pocos. La tarifa es acordada en el contrato. Factura mensual o por hito.

**Ejemplo:** IT consultant, graphic designer, writer, video editor.

**Flujo dominante:** Contract → Rate → WorkEvent → Invoice → Payment

### Perfil 3 — Pequeña empresa de servicios *(futuro)*
Vende servicios o proyectos a clientes. No necesariamente factura por horas — puede facturar por entregables, paquetes o tarifas fijas.

**Ejemplo:** Marketing agency, cleaning company, web development studio.

**Flujo futuro:** Customer → Project → Invoice → InvoiceItem (manual) → Payment

---

## Flujos de negocio existentes (v1)

### Flujo A — Registro y verificación de cuenta

```
Registro del Business Owner
    → Creación de Business
    → Verificación de email (vía Communications)
    → Configuración de FiscalProfile
    → Invitación de usuarios internos (opcional)
    → Conexión con Communications (para envío de facturas)
```

### Flujo B — Alta de cliente y contrato

```
Creación de Customer
    → Creación de Contact (datos de contacto de facturación)
    → Creación de Contract (condiciones de trabajo)
    → Creación de Rate(s) (tarifa/s aplicables al contrato)
```

### Flujo C — Ciclo de trabajo

```
Importación de CalendarIntegration (Google/iCal)
o
Creación manual de WorkEvent
    → Estado: draft
    → Revisión y aprobación por Staff/Business Admin
    → Estado: confirmed
    → Listo para facturar
```

### Flujo D — Ciclo de facturación

```
Selección de WorkEvents confirmados
    → Generación de Invoice
    → Creación de InvoiceItems (uno por WorkEvent + ítems manuales)
    → Revisión en estado draft
    → Envío al Customer (vía Communications)
    → Estado: sent → viewed → paid
    → Registro de Payment cuando el cliente paga
```

### Flujo E — Gestión de cobros

```
Invoice en estado sent
    → Vencimiento de dueDate → estado overdue (automático)
    → Recordatorio al Customer (vía Communications)
    → Registro de Payment cuando el cliente paga
    → Estado: paid o partial
    → Conciliación con banco (fase futura)
```

---

## Flujos futuros

### Flujo F — Venta de servicios / proyectos *(fase futura)*

```
Customer
    → Project / ServicePackage (entidad futura)
    → Invoice con InvoiceItems manuales
    → Payment
```

No requiere WorkEvents ni Rates por hora. InvoiceItem ya soporta ítems manuales desde v1.

### Flujo G — Conciliación bancaria *(fase futura)*

```
Importación de transacciones bancarias
    → Matching automático con Payments pendientes
    → Confirmación manual de matches ambiguos
    → Reconciliation report
```

### Flujo H — Reportes e inteligencia de negocio *(fase futura)*

```
Aggregation de WorkEvents, Invoices, Payments
    → Revenue por período
    → Horas trabajadas por Customer
    → Tasa de cobro efectiva
    → Proyección de ingresos
```

---

## Lo que Invoice App NO es

- **No es una app de contabilidad** — no maneja asientos contables, no genera balances, no reemplaza MYOB o Xero.
- **No es una app de nómina** — no calcula salarios de empleados, no procesa superannuation.
- **No es una herramienta de CRM** — no gestiona pipelines de ventas, no hace seguimiento de leads.
- **No es una plataforma de pagos** — no procesa transacciones; registra pagos recibidos.
- **No es solo un generador de facturas** — la factura es la salida de un proceso que empieza con el registro de trabajo.

---

## Principio rector

> *El trabajo ocurre primero. La factura lo documenta. El pago lo cierra.*

Todo el diseño del dominio parte de este principio. Cualquier entidad o flujo que invierta este orden (empezar por la factura sin registrar trabajo) es una extensión válida (Service Sale) pero no el caso principal.
