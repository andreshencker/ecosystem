# 02 — Reference Data Catalog

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual oficial

Catálogo completo de todos los datos de referencia que MDM posee. Para cada entidad se documenta: qué es, qué valores tiene, qué dominios la usan, y si es customizable a nivel Business.

---

## MDM-01: Country

**Qué es:** Lista de países según ISO 3166-1 alpha-2.

**Campos clave:** code (AU, NZ), name (Australia, New Zealand), defaultCurrency, defaultTimezone, defaultLanguage, phonePrefix, jurisdictionType.

**Dominios que usan:**
- Business (jurisdicción del negocio)
- Billing (destinatario de la factura)
- Financial (jurisdicción fiscal de la transacción)
- Accounting (Chart of Accounts templates por país)
- Integration (CDR/Open Banking disponible por país)

**Customizable por Business:** No.
**Frecuencia de cambio:** Muy baja (unificación de países, renombres).

---

## MDM-02: Currency

**Qué es:** Lista de monedas según ISO 4217.

**Campos clave:** code (AUD, NZD), symbol ($, £), name, decimalPlaces (2 para AUD, 0 para JPY), isActive.

**Dominios que usan:**
- Business (moneda funcional del negocio)
- Billing (moneda de la factura)
- Financial (moneda de la transacción)
- Analytics (conversión de moneda en reportes)
- Work (moneda de la Rate)

**Customizable por Business:** No. El Business elige cuál usar, pero no puede definir nuevas.

---

## MDM-03: Language

**Qué es:** Lista de idiomas según BCP 47.

**Campos clave:** code (en-AU, es-ES), name, direction (ltr/rtl), isActive.

**Dominios que usan:**
- Business (idioma del portal)
- Communications (idioma de los templates de email)
- Billing (idioma del PDF de factura)
- Document Management (idioma del documento)

---

## MDM-04: Timezone

**Qué es:** Lista de zonas horarias según IANA Timezone Database.

**Campos clave:** id (Australia/Sydney), offset (UTC+11), abbreviation (AEDT/AEST), daylightSaving.

**Dominios que usan:**
- Business (timezone del negocio — afecta todos los timestamps)
- Calendar (timezone de los eventos del calendario)
- Analytics (conversión de timestamps para reportes)
- Scheduling (ejecutar jobs en el timezone correcto)

---

## MDM-05: Industry

**Qué es:** Clasificación estándar de industrias (basado en ANZSIC para Australia, NAICS para Norteamérica).

**Campos clave:** code (6910 para Legal Services), name, parent (sector), standard (ANZSIC_2006, NAICS).

**Valores de ejemplo:**
```
6910 - Legal Services
6920 - Accounting, Tax Management, and Auditing
7000 - Computer System Design and Related Services
9211 - General Practice Medical Services
```

**Dominios que usan:**
- Business (clasificación del negocio)
- Analytics (benchmarking por industria — futuro)
- Platform (gestión de tenants por sector)

**Customizable por Business:** No. El Business elige la más cercana.

---

## MDM-06: BusinessType

**Qué es:** Tipo legal de estructura del negocio.

**Valores canónicos:**
```
sole_trader         — Autónomo / Freelancer
partnership         — Sociedad
company_pty_ltd     — Empresa Pty Ltd (Australia)
company_ltd         — Empresa Ltd (UK)
trust               — Fideicomiso
non_profit          — Organización sin fines de lucro
government          — Entidad gubernamental
```

**Dominios que usan:**
- Business (qué tipo de entidad legal es)
- Billing (afecta el formato de la factura y las obligaciones fiscales)
- Accounting (afecta la estructura del equity en el Balance Sheet)

---

## MDM-07: TaxType

**Qué es:** Tipos de impuesto sobre bienes y servicios por jurisdicción.

**Valores canónicos:**
```
gst_au          — Goods & Services Tax (Australia)
gst_nz          — Goods & Services Tax (New Zealand)
vat_uk          — Value Added Tax (United Kingdom)
vat_eu          — Value Added Tax (European Union)
hst_ca_on       — Harmonized Sales Tax (Canada - Ontario)
gst_ca          — GST (Canada)
pst_ca_bc       — Provincial Sales Tax (BC)
sales_tax_us    — Sales Tax (United States, varies by state)
no_tax          — Sin impuesto (servicio exento)
zero_rated      — Tasa cero (exportaciones)
```

**Dominios que usan:**
- Billing (qué impuesto aplica en la factura)
- Financial (FinancialTransaction.taxType)
- Accounting (PostingRule por tipo de impuesto)
- Analytics (GSTSummary, TaxSummary)

---

## MDM-08: TaxRate

**Qué es:** La tasa numérica de cada TaxType, con fechas de vigencia.

**Estructura conceptual:**
```
TaxRate {
    taxType:       string    — referencia a MDM-07
    jurisdiction:  string    — country + state si aplica
    rate:          decimal   — ej: 0.10 (10%)
    effectiveFrom: Date
    effectiveTo:   Date?     — null = vigente actualmente
    notes:         string?   — referencia legal
}
```

**Valores actuales (ejemplos):**
```
GST AU:     10%   desde 2000-07-01 (vigente)
GST NZ:     15%   desde 2010-10-01 (vigente)
VAT UK:     20%   desde 2011-01-04 (vigente)
HST ON CA:  13%   desde 2010-07-01 (vigente)
```

**Dominios que usan:** Financial (PostingEngine), Billing (InvoiceCalculation), Analytics (GSTPosition).

**Efectividad temporal:** OBLIGATORIA. Nunca se sobrescribe una tasa — se crea una nueva con nueva fecha de vigencia.

---

## MDM-09: HolidayCalendar

**Qué es:** Calendario de días festivos por jurisdicción y año.

**Estructura:**
```
HolidayCalendar {
    year:          integer
    jurisdiction:  string     — 'AU' | 'AU_NSW' | 'AU_VIC' | 'NZ' | etc.
    holidays: [
        { date, name, type: 'national' | 'state' | 'observed' }
    ]
}
```

**Dominios que usan:**
- Work (cálculo de tarifas de días festivos)
- Analytics (TimeDimension.isPublicHoliday)
- Billing (afecta el cálculo de payment terms: "Net 30 días hábiles")
- Automation (evitar enviar recordatorios en días festivos)

**Frecuencia de cambio:** Anualmente (las fechas de cada año se publican meses antes).

---

## MDM-10: PaymentTerms

**Qué es:** Condiciones de pago estándar.

**Valores canónicos:**
```
due_on_receipt  — Pago al recibir la factura
net_7           — Pago en 7 días
net_14          — Pago en 14 días
net_30          — Pago en 30 días
net_60          — Pago en 60 días
net_90          — Pago en 90 días
eom             — Final de mes
15_eom          — 15 del mes siguiente
cod             — Pago contra entrega
```

**Customizable por Business:** Sí — un Business puede agregar términos personalizados (ej. "Net_21") como overrides locales referenciando la base de MDM.

**Dominios que usan:** Billing (Invoice.paymentTerms), Customer (condiciones por defecto del cliente), Analytics (cálculo de DSO).

---

## MDM-11: PaymentMethod

**Qué es:** Métodos de pago aceptados.

**Valores canónicos:**
```
bank_transfer   — Transferencia bancaria
direct_debit    — Débito directo
card_credit     — Tarjeta de crédito
card_debit      — Tarjeta de débito
paypal          — PayPal
stripe          — Stripe
square          — Square
cash            — Efectivo
cheque          — Cheque
bpay            — BPAY (Australia)
payid           — PayID (Australia)
crypto          — Criptomoneda (futuro)
```

**Dominios que usan:** Billing (Payment.method), Financial (referencia en FinancialTransaction), Analytics (análisis de métodos de cobro).

---

## MDM-12: InvoiceStatus

**Qué es:** Estados posibles de una Invoice, en orden de ciclo de vida.

**Valores y semántica:**
```
draft       — Creada, no enviada. Puede modificarse.
sent        — Enviada al cliente. No puede modificar items.
viewed      — El cliente abrió la factura (tracking futuro).
partial     — Hay pagos pero no está completamente pagada.
paid        — Pagada completamente.
overdue     — Vencida sin pago completo.
disputed    — El cliente impugna la factura (futuro).
voided      — Anulada por el Business. No puede pagarse.
cancelled   — Cancelada antes de enviar.
```

**Máquina de estados:**
```
draft → sent → viewed → partial → paid
              ↓         ↓
           overdue   overdue
              ↓
           voided / disputed
```

**Dominios que usan:** Billing (estado de la Invoice), Analytics (clasificación de InvoiceFact), Automation (trigger de workflows).

---

## MDM-13: DocumentType

**Qué es:** Tipos de documentos que el sistema genera o almacena.

**Valores canónicos:**
```
invoice_pdf         — PDF de factura al cliente
credit_note_pdf     — PDF de nota de crédito
payment_receipt     — Comprobante de pago
contract            — Contrato de trabajo
statement           — Estado de cuenta del cliente
financial_report    — Reporte financiero (P&L, Balance Sheet)
bas_report          — Business Activity Statement (AU)
tax_certificate     — Certificado fiscal
receipt_image       — Imagen de recibo de gasto
payslip             — Recibo de pago a empleado (futuro)
export_csv          — Exportación de datos en CSV
export_pdf          — Exportación de datos en PDF
system_export       — Exportación completa de datos del Business
```

**Dominios que usan:** Document Management (clasificación de todos los documentos), Billing, Accounting, Analytics.

---

## MDM-14: WorkType

**Qué es:** Tipo de trabajo para un WorkEvent.

**Valores canónicos:**
```
standard        — Trabajo regular en horario estándar
overtime        — Horas extras
double_time     — Pago doble (ej. feriados en algunos países)
public_holiday  — Día festivo
weekend         — Trabajo en fin de semana
night_shift     — Turno nocturno
on_call         — Guardia / disponibilidad
travel          — Tiempo de viaje billable
training        — Capacitación billable
admin           — Tiempo administrativo (no billable generalmente)
```

**Dominios que usan:** Work (WorkEvent.workType), Billing (determina qué Rate aplicar).

---

## MDM-15: RateType

**Qué es:** Cómo se cobra el trabajo.

**Valores canónicos:**
```
hourly          — Por hora
daily           — Por día
weekly          — Por semana
fixed           — Precio fijo por proyecto
milestone       — Por hito cumplido
retainer        — Retención mensual fija
per_unit        — Por unidad (diseño de páginas, traducciones, etc.)
```

**Dominios que usan:** Work (Rate.type), Billing (InvoiceItem.rateType), Analytics.

---

## MDM-16: UnitOfMeasure

**Qué es:** Unidad de medida para servicios y productos.

**Valores canónicos:**
```
hours           — Horas
days            — Días
weeks           — Semanas
units           — Unidades genéricas
pages           — Páginas (redacción, traducción)
words           — Palabras (traducción)
kg              — Kilogramos (servicios de transporte)
km              — Kilómetros (transporte, viajes)
sessions        — Sesiones (coaching, terapia)
```

**Dominios que usan:** Work (Rate.unit), Billing (InvoiceItem.unit), Inventory (Product.unit — futuro).

---

## MDM-17: CustomerCategory

**Qué es:** Clasificación del tipo de cliente.

**Valores canónicos:**
```
small_business      — Pequeña empresa (< 20 empleados)
medium_business     — Mediana empresa
enterprise          — Gran empresa
government          — Entidad gubernamental
non_profit          — ONG
individual          — Persona física
startup             — Empresa nueva
```

**Customizable por Business:** Sí. Un Business puede definir sus propias categorías como override.
**Dominios que usan:** Customer, Analytics (segmentación de clientes).

---

## MDM-18: ExpenseCategory

**Qué es:** Clasificación de gastos para el módulo de Expenses (Fase 6).

**Valores canónicos:**
```
travel              — Viajes y transporte
accommodation       — Alojamiento
meals               — Comidas y entretenimiento
equipment           — Equipamiento de oficina
software            — Licencias de software
professional_fees   — Honorarios profesionales
marketing           — Marketing y publicidad
training            — Capacitación
utilities           — Servicios públicos
insurance           — Seguros
communication       — Teléfono, internet
maintenance         — Mantenimiento y reparaciones
office_supplies     — Material de oficina
other               — Otros
```

**Customizable por Business:** Sí. Pueden agregar sus propias categorías.
**Dominios que usan:** Expenses (futuro Fase 6), Analytics, Accounting (mapeo a cuentas del Chart of Accounts).

---

## MDM-19: AssetCategory

**Qué es:** Clasificación de activos fijos para el módulo de Assets (Fase 8).

**Valores canónicos:**
```
computer_hardware   — Computadoras, servidores
computer_software   — Software con licencia perpetua
office_furniture    — Muebles de oficina
vehicle             — Vehículos
machinery           — Maquinaria y equipos
real_estate         — Propiedades
leasehold           — Mejoras en propiedades arrendadas
intangible          — Activos intangibles (patentes, marcas)
```

**Customizable por Business:** Sí.
**Dominios que usan:** Assets (futuro Fase 8), Accounting (cuentas de activos), Analytics.

---

## MDM-20: RoleCatalog

**Qué es:** Roles de usuario del ERP con su alcance y descripción.

**Valores canónicos:**
```
platform_admin    — Administrador de la plataforma SaaS. Alcance global.
business_owner    — Propietario del Business. Acceso total en su tenant.
business_admin    — Administrador operativo. Acceso completo excepto acciones destructivas.
accountant        — Contador. Acceso financiero: facturas, pagos, reportes, ledger.
staff             — Personal. Acceso operativo: WorkEvents, Customers, Contracts.
viewer            — Solo lectura. Puede ver pero no modificar.
api_service       — Token de servicio (para integraciones externas).
```

**Inmutable por Business:** Los roles son definidos por la plataforma. Un Business elige cuál asignar a cada usuario.
**Dominios que usan:** Identity (User.role), Authorization middleware, Analytics (reportes por rol).

---

## MDM-21: PermissionCatalog

**Qué es:** Catálogo granular de permisos del sistema.

**Estructura:**
```
Permission {
    code:        string    — 'invoices:create', 'invoices:send', etc.
    resource:    string    — 'invoice' | 'payment' | 'work_event' | etc.
    action:      string    — 'create' | 'read' | 'update' | 'delete' | 'approve'
    description: string
    roles:       string[]  — roles que tienen este permiso por defecto
}
```

**Ejemplos:**
```
invoices:create       → business_owner, business_admin
invoices:send         → business_owner, business_admin
invoices:void         → business_owner
payments:record       → business_owner, business_admin, accountant
ledger:view           → business_owner, accountant
ledger:close_period   → business_owner, accountant
platform:manage       → platform_admin
```

---

## MDM-22: CalendarProvider

**Qué es:** Proveedores de calendario disponibles para sincronización.

**Valores canónicos:**
```
google_calendar    — Google Calendar (OAuth2)
apple_calendar     — Apple Calendar (CalDAV)
outlook_calendar   — Microsoft Outlook (Graph API)
ical_url           — URL de suscripción iCal (.ics)
caldav             — CalDAV genérico
```

**Dominios que usan:** Calendar (CalendarIntegration.provider), Integration Hub.

---

## MDM-23: CommunicationProvider

**Qué es:** Proveedores de comunicación disponibles para el módulo de Communications.

**Valores canónicos:**
```
sendgrid           — SendGrid Email
mailgun            — Mailgun Email
aws_ses            — Amazon SES Email
smtp_custom        — SMTP personalizado
twilio_sms         — Twilio SMS
vonage_sms         — Vonage / Nexmo SMS
firebase_push      — Firebase Push Notifications
apns               — Apple Push Notification Service
fcm                — Firebase Cloud Messaging (Android)
```

**Dominios que usan:** Communications Platform, Integration Hub.

---

## MDM-24: IntegrationProvider

**Qué es:** Catálogo de sistemas externos con los que el ERP puede integrarse.

**Categorías:**

```
CONTABILIDAD EXTERNA:
  xero               — Xero Accounting
  myob               — MYOB AccountRight
  quickbooks         — QuickBooks Online
  sage               — Sage 50/200

PAGOS:
  stripe             — Stripe Payments
  square             — Square Payments
  paypal             — PayPal
  gocardless         — GoCardless (Direct Debit)
  eway               — eWAY (Australia)

BANCARIO:
  cdr_australia      — Consumer Data Right (Open Banking AU)
  ofx_import         — Importación OFX/QFX
  csv_bank           — CSV de extracto bancario

ALMACENAMIENTO:
  aws_s3             — Amazon S3
  google_drive       — Google Drive
  onedrive           — Microsoft OneDrive
  dropbox            — Dropbox
  cloudflare_r2      — Cloudflare R2

CRM:
  salesforce         — Salesforce
  hubspot            — HubSpot
  pipedrive          — Pipedrive

MARKETPLACE:
  shopify            — Shopify Orders
  woocommerce        — WooCommerce
  ebay               — eBay
  etsy               — Etsy

GOBIERNO/FISCAL:
  ato_australia      — ATO Business Portal (Australia)
  ird_new_zealand    — IRD (New Zealand)
  single_touch_payroll — STP (ATO Payroll Reporting)
```

---

## MDM-25: FinancialTransactionType

**Qué es:** Catálogo completo de tipos de FinancialTransaction. Referenciado por el PostingEngine.

Ver catálogo completo en `docs/domain/accounting/02-financial-transaction.md` sección "Catálogo de tipos".

**MDM es la fuente de verdad**: el catálogo vive en MDM, la descripción detallada vive en la documentación del Financial domain.

---

## MDM-26: KPICatalog

**Qué es:** Registro de todos los KPIs que Analytics puede calcular.

**Campos por KPI:**
```
kpiCode:         string    — 'KPI-R-001'
name:            string    — 'Gross Revenue'
category:        string    — 'revenue' | 'ar' | 'work' | etc.
unit:            string    — 'amount' | 'percentage' | 'count' | 'days'
availableFrom:   string    — fase del ERP donde se habilita ('Fase 3')
description:     string
```

**Dominios que usan:** Analytics (catálogo de KPIs disponibles), Business App (qué mostrar en el dashboard según la fase actual del tenant).

---

## MDM-27: MLModelCatalog

**Qué es:** Registro de modelos de ML disponibles en Analytics.

**Campos por modelo:**
```
modelCode:       string    — 'ML-001'
name:            string    — 'Revenue Forecast'
category:        string    — 'forecast' | 'prediction' | 'segmentation' | 'anomaly'
availableFrom:   string    — fase de Analytics
status:          string    — 'design' | 'development' | 'training' | 'deployed'
inputFeatures:   string[]
outputType:      string
description:     string
```
