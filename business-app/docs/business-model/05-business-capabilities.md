# 05 — Business Capabilities

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

Las Business Capabilities describen qué puede hacer el ERP — no desde la perspectiva técnica, sino desde la perspectiva del negocio. Una capability es una capacidad que el ERP otorga a sus usuarios: algo que un Business puede hacer usando el sistema y que no podría hacer sin él.

Este documento no describe implementaciones. Describe las capacidades de negocio que el sistema entrega, cuándo se vuelven disponibles, y de qué otras capabilities dependen.

---

## Principios de las Capabilities

**Principio 1 — Las capabilities son aditivas:**
El ERP siempre agrega capabilities. Nunca las elimina. Un Business en Fase 3 tiene acceso a todas las capabilities de las Fases 1, 2, y 3 simultáneamente.

**Principio 2 — Cada capability tiene un dueño:**
Cada capability pertenece a exactamente un dominio. Si dos dominios parecen dueños de la misma capability, hay un problema de diseño de modelo.

**Principio 3 — Las capabilities tienen dependencias explícitas:**
Una capability puede requerir que otra esté habilitada para funcionar. Estas dependencias son parte del contrato del negocio, no solo restricciones técnicas.

**Principio 4 — Una capability habilitada nunca se quita:**
Una vez que el ERP otorga una capability al Business, esa capability existe permanentemente — aunque el Business la deje de usar activamente.

**Principio 5 — Las capabilities de Platform Admin son ortogonales:**
El Platform Admin no es un Business Owner con más permisos. Tiene un conjunto de capabilities completamente distinto: opera la plataforma SaaS, no los datos de ningún Business.

---

## Mapa de capabilities por capa

```
CAPA DE ACCESO
  CAP-01: Identity & Access Management
  CAP-02: Business Configuration

CAPA OPERATIVA
  CAP-03: Customer Management
  CAP-04: Work Management
  CAP-05: Calendar Integration

CAPA DE COBRANZA
  CAP-06: Billing & Collections

CAPA FINANCIERA
  CAP-07: Financial Engine (automático — no interactivo)
  CAP-08: Accounting & Reporting

CAPA DE INTELIGENCIA
  CAP-09: Analytics & Business Intelligence

CAPA TRANSVERSAL
  CAP-10: Document Management
  CAP-11: Automation
  CAP-12: Integration Hub
```

---

## CAP-01 — Identity & Access Management

**Dominio dueño:** Identity
**Disponible desde:** Pre-Fase 1 (ya operativo)

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-01-01 | Registro de Business | Crear una cuenta de Business en el ERP | Nuevo usuario (sin rol previo) |
| CAP-01-02 | Verificación de email | Confirmar la identidad del registrante por email | Sistema |
| CAP-01-03 | Inicio de sesión | Acceder al portal con credenciales | Todo User activo |
| CAP-01-04 | Invitación de Users | Invitar a colaboradores al Business | business_owner |
| CAP-01-05 | Asignación de roles | Definir qué rol tiene cada User en el Business | business_owner |
| CAP-01-06 | Desactivación de User | Revocar acceso sin eliminar datos del User | business_owner, business_admin |
| CAP-01-07 | Transferencia de ownership | Transferir el role `business_owner` a otro User | business_owner |
| CAP-01-08 | Recuperación de contraseña | Restablecer el acceso de un User por email | Todo User |

### Dependencias
Ninguna — es la capa de base sobre la que todo lo demás se construye.

### Regla de excepción
La capability CAP-01-06 no puede aplicarse al último `business_owner` activo del Business mientras sea el único. Primero debe ejecutarse CAP-01-07 (ver BR-ID-005).

---

## CAP-02 — Business Configuration

**Dominio dueño:** Business
**Disponible desde:** Fase 1

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-02-01 | Perfil del Business | Configurar nombre, logo, timezone, moneda, dirección | business_owner, business_admin |
| CAP-02-02 | Perfil fiscal | Configurar ABN, GST, cuenta bancaria receptora de pagos | business_owner |
| CAP-02-03 | Condiciones de pago por defecto | Definir días de vencimiento estándar para Invoices nuevas | business_owner, business_admin |
| CAP-02-04 | Año fiscal | Definir si el año fiscal es calendario (Jan-Dec) o australiano (Jul-Jun) | business_owner |

### Dependencias
- CAP-01 (Identity) — para conocer quién está configurando

### Prerrequisito crítico
CAP-02-02 (FiscalProfile con ABN y GST configurados) es prerrequisito para habilitar CAP-06 (Billing). Sin FiscalProfile completo, no pueden generarse Invoices válidas.

---

## CAP-03 — Customer Management

**Dominio dueño:** Customer
**Disponible desde:** Fase 1

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-03-01 | Alta de Customer | Registrar una empresa o persona como Customer | staff |
| CAP-03-02 | Edición de Customer | Actualizar nombre, dirección, ABN, condiciones de pago | business_admin |
| CAP-03-03 | Gestión de Contacts | Agregar y editar personas de contacto dentro de un Customer company | staff |
| CAP-03-04 | Búsqueda y filtrado | Buscar Customers por nombre, ABN, estado | viewer |
| CAP-03-05 | Desactivación de Customer | Marcar un Customer como `inactive` | business_admin |
| CAP-03-06 | Historial del Customer | Ver todas las Invoices, Contracts y Payments de un Customer | accountant, viewer |

### Dependencias
- CAP-02-01 (Business configurado — para asociar el Customer al businessId correcto)

### Restricción
La capability CAP-03-05 está bloqueada si el Customer tiene Contracts `active` o Invoices en estado `sent`, `viewed`, `partial`, u `overdue` (BR-CUS-002).

---

## CAP-04 — Work Management

**Dominio dueño:** Work
**Disponible desde:** Fase 2

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-04-01 | Creación de Contract | Establecer el acuerdo de trabajo con un Customer | business_admin |
| CAP-04-02 | Gestión de Rates | Definir y modificar tarifas dentro de un Contract activo | business_admin |
| CAP-04-03 | Registro manual de WorkEvent | Ingresar tiempo trabajado manualmente (fecha, inicio, fin) | staff |
| CAP-04-04 | Confirmación de WorkEvent | Aprobar un WorkEvent para que sea billable | business_admin |
| CAP-04-05 | Anulación de WorkEvent | Invalidar un WorkEvent antes de que sea facturado | business_admin |
| CAP-04-06 | Historial de trabajo | Ver WorkEvents por Contract, Customer, o período | viewer |
| CAP-04-07 | Cierre de Contract | Completar o cancelar un Contract existente | business_admin |

### Dependencias
- CAP-03 (Customer existente — un Contract requiere un Customer)

### Nota sobre el cálculo automático
El monto de cada WorkEvent se calcula automáticamente (horas × Rate) al confirmar. Este cálculo no es una capability manual — es una consecuencia de CAP-04-04.

---

## CAP-05 — Calendar Integration

**Dominio dueño:** Calendar
**Disponible desde:** Fase 2

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-05-01 | Conexión con proveedor | Autorizar acceso a Google Calendar u Outlook via OAuth | business_owner, staff |
| CAP-05-02 | Importación automática | Los eventos del calendario se importan como WorkEvents `draft` en segundo plano | Sistema |
| CAP-05-03 | Reconexión | Renovar la autorización cuando el token expira | business_owner, staff |
| CAP-05-04 | Pausa de sincronización | Suspender temporalmente la importación automática | business_owner, staff |
| CAP-05-05 | Desconexión | Revocar el acceso del ERP al calendario | business_owner, staff |

### Dependencias
- CAP-04 (Work Management — para tener Contracts activos a los cuales asignar los WorkEvents importados)

### Nota sobre la dirección de la integración
La integración es unidireccional: el ERP importa desde el calendario externo, pero nunca escribe en él. Los cambios en el calendario externo pueden actualizar WorkEvents `draft` existentes, pero nunca los confirman automáticamente.

---

## CAP-06 — Billing & Collections

**Dominio dueño:** Billing
**Disponible desde:** Fase 3

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-06-01 | Generación de Invoice desde WorkEvents | Crear una Invoice agrupando WorkEvents confirmados | business_admin |
| CAP-06-02 | Invoice con ítems libres | Crear una Invoice con líneas manuales (no basada en WorkEvents) | business_admin |
| CAP-06-03 | Cálculo de GST | El sistema aplica GST automáticamente según el FiscalProfile | Sistema |
| CAP-06-04 | Numeración automática | Asignar número de Invoice secuencial e irrepetible | Sistema |
| CAP-06-05 | Envío de Invoice por email | Enviar la Invoice al Customer directamente desde el ERP | business_admin |
| CAP-06-06 | Tracking de apertura | Registrar si el Customer abrió el email de la Invoice | Sistema |
| CAP-06-07 | Registro de Payment | Registrar un pago recibido (total o parcial) contra una Invoice | accountant |
| CAP-06-08 | Anulación de Invoice | Anular una Invoice emitida incorrectamente | business_owner |
| CAP-06-09 | Alerta de vencimiento | Detección automática diaria de Invoices overdue | Sistema |
| CAP-06-10 | PDF de Invoice | Generar el PDF formal de la Invoice | Sistema |
| CAP-06-11 | Historial de cobranza | Ver todas las Invoices y Payments de un Customer o período | accountant, viewer |

### Dependencias
- CAP-02-02 (FiscalProfile con ABN, GST y condiciones de pago)
- CAP-03 (Customer como destinatario de la Invoice)
- CAP-04 (WorkEvents confirmados como base de InvoiceItems — excepto en facturas libres)

---

## CAP-07 — Financial Engine

**Dominio dueño:** Financial
**Disponible desde:** Fase 4
**Tipo:** Automático — el Business Owner no interactúa directamente con esta capa

### Capabilities (todas del sistema)

| ID | Capability | Descripción |
|---|---|---|
| CAP-07-01 | Captura de hechos financieros | Toda operación económica genera automáticamente una FinancialTransaction |
| CAP-07-02 | Normalización | Convierte eventos de negocio en hechos financieros con gross/net/tax |
| CAP-07-03 | Idempotencia | El mismo hecho de negocio no genera dos FinancialTransactions (BR-FIN-005) |
| CAP-07-04 | Routing contable | Envía FinancialTransactions al Accounting Engine con el FiscalPeriod correcto |

### Dependencias
- CAP-06 (Billing — los primeros hechos financieros provienen de Invoices y Payments)
- CAP-08 parcial (para verificar que el FiscalPeriod está `open` antes de registrar)

---

## CAP-08 — Accounting & Reporting

**Dominio dueño:** Accounting
**Disponible desde:** Fase 4

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-08-01 | Plan de cuentas | Configurar el Chart of Accounts desde plantilla estándar de la jurisdicción | accountant |
| CAP-08-02 | Libro diario automático | El Accounting Engine genera JournalEntries desde FinancialTransactions | Sistema |
| CAP-08-03 | Libro mayor en tiempo real | El General Ledger refleja todos los movimientos al instante | accountant |
| CAP-08-04 | Gestión de períodos fiscales | Abrir, cerrar, y bloquear FiscalPeriods | accountant, business_owner |
| CAP-08-05 | Balance de Prueba | Generar el Trial Balance en cualquier momento | accountant |
| CAP-08-06 | Estado de Resultados (P&L) | P&L del Business para un período dado | accountant, business_owner |
| CAP-08-07 | Balance General | Balance Sheet del Business a una fecha | accountant, business_owner |
| CAP-08-08 | Posición de GST (BAS) | Calcular el GST a pagar al ATO para el trimestre | accountant, business_owner |

### Dependencias
- CAP-07 (Financial Engine — los JournalEntries se generan desde FinancialTransactions)
- CAP-02-02 (FiscalProfile con jurisdicción y configuración de GST)

---

## CAP-09 — Analytics & Business Intelligence

**Dominio dueño:** Analytics
**Disponible desde:** Fase 5

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-09-01 | Dashboard principal | Vista resumen del estado del Business (revenue, AR, workload) | business_owner |
| CAP-09-02 | Análisis de ingresos | Revenue por período, Customer, y tipo de trabajo | business_owner |
| CAP-09-03 | Aging de cobranza | Accounts Receivable aging report (30/60/90 días) | accountant |
| CAP-09-04 | Análisis de carga de trabajo | Horas por período, por User, por Customer | business_owner |
| CAP-09-05 | Rentabilidad por Customer | Qué Customers generan más margen | business_owner |
| CAP-09-06 | Flujo de caja | Proyección de efectivo entrante y saliente | business_owner |
| CAP-09-07 | Exportación | Reportes en PDF, CSV, Excel | accountant |
| CAP-09-08 | Reportes programados | Envío automático de reportes por email a intervalos definidos | business_owner |

### Dependencias
- CAP-08 (Accounting — para datos del General Ledger)
- CAP-06 (Billing — para análisis de Invoices y Payments)
- CAP-04 (Work — para análisis de horas trabajadas)

### Invariante absoluta
Analytics es estrictamente de lectura. Ninguna capability de CAP-09 modifica datos de ningún dominio (BR-ANA-001).

---

## CAP-10 — Document Management

**Dominio dueño:** Document Management
**Disponible desde:** Fase 3 (los PDFs de Invoice lo requieren)

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-10-01 | Almacenamiento | Guardar documentos con versionado automático | Sistema (automático) |
| CAP-10-02 | Descarga | Descargar cualquier documento por su ID | viewer |
| CAP-10-03 | Versionado | Mantener historial de versiones de cada documento | Sistema |
| CAP-10-04 | Archivado | Archivar documentos al cerrar el período al que pertenecen | Sistema |
| CAP-10-05 | Retención legal | Garantizar retención de documentos financieros por 7 años (BR-DOC-003) | Sistema |

---

## CAP-11 — Automation

**Dominio dueño:** Automation
**Disponible desde:** Fase 3

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-11-01 | Workflows por eventos | Ejecutar secuencias automáticas ante eventos de negocio | Sistema |
| CAP-11-02 | Recordatorios de pago | Enviar recordatorios automáticos a Customers con Invoices vencidas | Sistema (configurable por business_admin) |
| CAP-11-03 | Notificaciones internas | Alertar a Users del Business sobre eventos importantes | Sistema |
| CAP-11-04 | Retry automático | Reintentar acciones que fallaron por problemas transitorios | Sistema |
| CAP-11-05 | Dead Letter Queue | Capturar y exponer para revisión manual las acciones que agotaron los reintentos | business_admin |

---

## CAP-12 — Integration Hub

**Dominio dueño:** Integration Hub
**Disponible desde:** Fase 2

### Capabilities

| ID | Capability | Descripción | Rol mínimo |
|---|---|---|---|
| CAP-12-01 | Integración con Calendar | Conectar Google Calendar u Outlook para importar WorkEvents | business_owner, staff |
| CAP-12-02 | Integración con Banking | Conectar el banco del Business para importar movimientos bancarios (Fase 7) | business_owner |
| CAP-12-03 | Exportación a contabilidad externa | Exportar datos a Xero, MYOB, QuickBooks (Fase 4+) | accountant |
| CAP-12-04 | Webhooks entrantes | Recibir eventos de sistemas externos con deduplicación automática | Sistema |

---

## Capabilities disponibles por Rol

```
business_owner ─── Todas las capabilities de su Business
business_admin ─── CAP-02 (parcial), CAP-03, CAP-04, CAP-05, CAP-06, CAP-11
accountant     ─── CAP-06 (registrar pagos), CAP-08, CAP-09, CAP-10
staff          ─── CAP-03 (lectura), CAP-04 (registro y confirmación), CAP-05
viewer         ─── Lectura de CAP-03, CAP-04, CAP-06, CAP-09
platform_admin ─── Capabilities de la plataforma SaaS — ninguna del negocio del Business
```

---

## Capabilities disponibles por Fase

```
FASE 1   CAP-01 + CAP-02 + CAP-03
FASE 2   + CAP-04 + CAP-05 + CAP-12 (parcial)
FASE 3   + CAP-06 + CAP-10 (parcial) + CAP-11
FASE 4   + CAP-07 + CAP-08
FASE 5   + CAP-09
FASE 6+  Extensiones de CAP-06, CAP-07, CAP-08 (Expenses, AP, Banking)
```

---

## Lo que el ERP nunca entregará como capability

Estas son capacidades que quedan fuera del alcance del ERP en cualquier fase de su evolución, por decisión de diseño del modelo de negocio:

| Capability excluida | Justificación |
|---|---|
| Cotizaciones y presupuestos (Quotes) | El ERP registra trabajo realizado — no trabajo futuro ni propuestas |
| Portal de acceso para el Customer | El Customer no tiene acceso al sistema — solo recibe documentos |
| Gestión de pipeline de ventas (CRM) | El ERP es post-venta; la gestión de oportunidades es responsabilidad del Business |
| Gestión de proyectos (Gantt, Kanban, tareas) | El ERP no es una herramienta de gestión de proyectos |
| Procesamiento de pagos en línea | El ERP registra pagos recibidos — no los procesa (eso es Stripe, Square, Braintree) |
| Gestión de contratos legales | El Contract del ERP es el acuerdo de negocio; el documento legal es externo |

---

## Decisiones arquitectónicas de capabilities

**DEC-CAP-001 — FiscalProfile como gate de Billing:**
La capability CAP-06 (Billing) requiere que CAP-02-02 (FiscalProfile con ABN y GST) esté completo. El sistema bloquea la generación de Invoices si el FiscalProfile está incompleto. Esto no es un error técnico — es una regla de negocio que protege la validez fiscal de las facturas.

**DEC-CAP-002 — Analytics es exclusivamente read-only:**
Las capabilities de CAP-09 son de solo lectura sin excepciones. Si Analytics necesitara escribir en algún dominio en el futuro, eso indica que el dato pertenece a otro dominio y no a Analytics.

**DEC-CAP-003 — Business suspendido pierde operación, no historial:**
Un Business en estado `suspended` pierde acceso a las capabilities operativas (CAP-04 a CAP-11), pero conserva acceso de solo lectura a CAP-06 y CAP-09 durante el período de gracia para exportar sus datos.

**DEC-CAP-004 — La confirmación de WorkEvents es siempre humana:**
La capability CAP-04-04 nunca es automática — ni siquiera cuando el WorkEvent proviene del Calendar. Un WorkEvent importado nace como `draft` y requiere confirmación explícita de un User. Esto protege contra errores de importación que afecten la facturación.
