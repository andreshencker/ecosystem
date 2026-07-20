# 07 — Business Evolution

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Oficial

La evolución del ERP no es un plan técnico. Es un plan de negocio: qué preguntas puede responder el sistema en cada año de su vida, qué problemas del Business Owner resuelve, y qué puertas se cierran o abren cuando se agrega cada nuevo módulo.

Este documento responde "¿cómo crecerá el negocio?" desde el lenguaje del modelo — no desde el punto de vista de sprints ni de código. Describe cómo cambian las capacidades, las reglas, y las responsabilidades del ERP a medida que madura.

---

## El principio de la evolución

> El ERP crece en riqueza semántica, no en complejidad estructural.
>
> Cada fase agrega preguntas que el Business Owner puede hacerle al sistema. Ninguna fase invalida las respuestas que el sistema ya sabía dar.

La única forma en que esto es sostenible es que las decisiones de las fases tempranas sean correctas. Un modelo mal diseñado en la Fase 1 impide que la Fase 4 pueda construirse encima sin deuda técnica masiva.

---

## Invariantes de la evolución

Hay hechos que nunca cambian, independientemente de cuántas fases se agreguen:

| Invariante | Descripción |
|---|---|
| Business es siempre el root del tenant | Ningún dato de negocio puede existir sin `businessId` |
| FinancialTransaction es el único canal hacia Accounting | Ningún módulo futuro puede escribir JournalEntries directamente |
| La corrección es aditiva | Nunca se modifica un hecho pasado — se agrega una transacción de corrección |
| El Lenguaje Ubicuo es permanente | Los términos canónicos no se renombran sin deprecar el anterior explícitamente |
| La arquitectura event-driven no se negocia | Los nuevos módulos se comunican por Domain Events — nunca por llamadas directas entre servicios |
| El `businessKey` es inmutable | Una vez creado, nunca cambia bajo ninguna circunstancia (BR-BUS-002) |
| Analytics es siempre de solo lectura | Ninguna fase futura cambia esta regla (BR-ANA-001) |

---

## Fase 1 — El negocio sabe quién es y con quién trabaja

**La pregunta de negocio que responde:**
> ¿Tengo todo lo que necesito para empezar a facturar? ¿Sé quién soy como empresa y a quién le facturo?

### Qué cambia en el modelo de negocio
- El ERP conoce la identidad fiscal del Business (ABN, GST, cuenta bancaria)
- El ERP puede identificar a los Customers del Business
- El Business Owner y sus colaboradores tienen roles definidos y acceso controlado

### Lo que todavía no puede hacer el Business
- Registrar tiempo trabajado (falta Work domain)
- Generar facturas (falta Billing)
- Llevar contabilidad (falta Accounting)

### Decisiones de modelo tomadas en esta fase que son permanentes

```
DECISIONES PERMANENTES DE FASE 1:

1. El businessKey se define y es inmutable desde aquí
2. La estructura de Roles queda fija:
   business_owner, business_admin, accountant, staff, viewer, platform_admin
3. El FiscalProfile SE SEPARA del Business (no están en el mismo concepto)
   → Esta separación permite que el perfil fiscal evolucione independientemente
4. Un User pertenece a exactamente un Business (BR-ID-001)
   → En v1 esto es permanente; la multi-membresía es una Pregunta Abierta
```

### Modelo al final de la Fase 1

```
Business ──────────── FiscalProfile
    │
    ├──── Users (con Roles)
    │
    └──── Customers
              └── Contacts
```

---

## Fase 2 — El negocio sabe cuánto trabaja y para quién

**La pregunta de negocio que responde:**
> ¿Puedo registrar el tiempo que trabajo para cada cliente y saber cuánto debería cobrarle?

### Qué cambia en el modelo de negocio
- El tiempo trabajado se convierte en un hecho de negocio medible: el WorkEvent
- Los acuerdos con Customers se formalizan: los Contracts
- Las tarifas acordadas quedan registradas: las Rates
- El calendario externo se convierte en una fuente de WorkEvents `draft`

### Lo que todavía no puede hacer el Business
- Facturar el trabajo (los WorkEvents están `confirmed` pero no tienen Invoice)
- Ver la posición financiera (falta Accounting)

### Decisiones de modelo tomadas en esta fase que son permanentes

```
DECISIONES PERMANENTES DE FASE 2:

1. El monto calculado de un WorkEvent histórico es inmutable (BR-RAT-003)
   → Si la Rate cambia, los WorkEvents pasados mantienen su monto original
2. El billingCycle del Contract no puede cambiar una vez hay WorkEvents (BR-CON-005)
3. Work NUNCA crea Invoices — solo provee WorkEvents billables
4. La confirmación de WorkEvents es siempre humana — nunca automática
5. La integración de Calendar es unidireccional: importa, no escribe en el proveedor externo
```

### Tensión detectada en esta fase

Los WorkEvents `confirmed` de Fase 2 "esperan" a que la Fase 3 los convierta en Invoices. Esto no es una inconsistencia — es la arquitectura por fases funcionando correctamente. Un sistema que tiene WorkEvents confirmados sin Invoices es un sistema correcto en Fase 2.

### Modelo al final de la Fase 2

```
Business ──── Customer ──── Contract ──── Rate(s)
                                │
                            WorkEvent
                           draft → confirmed (billable)
                                │
                       CalendarIntegration
                       (Google Calendar)
```

---

## Fase 3 — El negocio cobra por su trabajo

**La pregunta de negocio que responde:**
> ¿Puedo emitir una factura formal, enviarla a mi cliente, y saber cuándo me paga?

### Qué cambia en el modelo de negocio
- El trabajo confirmado se convierte en documentos financieros exigibles (Invoices)
- El Business tiene un número de factura único y secuencial por jurisdicción
- El ciclo de cobranza comienza: `draft → sent → paid`
- Los Customers reciben sus facturas por email desde el ERP
- El Business sabe qué facturas están vencidas (job diario)

### Lo que todavía no puede hacer el Business
- Tener posición financiera formal en el libro mayor (falta Financial Engine)
- Los Payments están registrados en Billing, pero no tienen asiento contable

### Decisiones de modelo tomadas en esta fase que son permanentes

```
DECISIONES PERMANENTES DE FASE 3:

1. Una Invoice nunca se elimina — solo se voids o cancela (BR-INV-008)
2. Los InvoiceItems son inmutables desde el estado sent (BR-INV-006)
3. Billing NUNCA escribe en el Journal — esta frontera es la base de la Fase 4 (BR-INV-007)
4. El invoiceNumber es inmutable desde su generación (BR-INV-005)
5. Un WorkEvent solo puede estar en una Invoice activa a la vez (BR-WRK-006)
```

### Nota sobre la coherencia del modelo en esta fase

Al final de la Fase 3, los Payments existen en Billing, pero no hay ningún JournalEntry que los represente. El libro mayor está vacío. Esto es correcto: la Fase 4 definirá cómo retroalimentar el Accounting Engine con los hechos financieros acumulados — esa es la decisión de Opening Balances (ver Puertas de Decisión).

### Modelo al final de la Fase 3

```
Business ──── Customer ──── Invoice ──── InvoiceItems ──── WorkEvents
    │                           │
FiscalProfile              Payment(s)
    │                      recorded → cleared
invoiceNumber (secuencial)
```

---

## Fase 4 — El negocio tiene libros contables formales

**La pregunta de negocio que responde:**
> ¿Cuál es mi posición financiera real? ¿Puedo preparar mi BAS? ¿Cuánto le debo al ATO?

### Qué cambia en el modelo de negocio
- Cada hecho económico del Business genera automáticamente asientos contables
- El General Ledger existe y refleja la realidad financiera del Business
- El P&L y el Balance Sheet son reportes en tiempo real, no documentos manuales
- El BAS trimestral se convierte en un cálculo, no en un proceso de horas

### Lo que todavía no puede hacer el Business
- Ver tendencias y comparativos entre períodos (falta Analytics)
- Ver KPIs de desempeño del negocio

### Decisiones de modelo tomadas en esta fase que son permanentes

```
DECISIONES PERMANENTES DE FASE 4:

1. El Accounting Engine NUNCA consulta Invoices, Payments, ni Work (BR-ACC-005)
2. Un FiscalPeriod locked NUNCA se reabre (BR-ACC-007)
3. Las PostingRules son configuración (datos), no código
   → Esta decisión permite agregar nuevas jurisdicciones sin modificar el Engine
4. La corrección contable siempre es aditiva — nunca modifica un JournalEntry posted
```

### El flujo de la Fase 4

```
Evento de negocio (InvoiceSent, PaymentRecorded)
        │
        ▼
FinancialTransaction (inmutable, normalizada)
        │
        ▼
Accounting Engine + PostingRules
        │
        ▼
JournalEntry (inmutable, posted)
        │
        ▼
General Ledger → P&L / Balance Sheet / BAS
```

### Cambio semántico importante

Antes de la Fase 4: "el Business sabe cuánto le deben" vía el `amountDue` de las Invoices.
Después de la Fase 4: "el Business sabe su posición financiera real" vía el General Ledger.

La segunda es la fuente de verdad contable. La primera es la vista operativa de cobranza. Ambas coexisten y deben ser consistentes — si divergen, hay un bug.

---

## Fase 5 — El negocio se entiende a sí mismo

**La pregunta de negocio que responde:**
> ¿Cómo está mi negocio? ¿Cuáles son mis clientes más rentables? ¿Hacia dónde voy?

### Qué cambia en el modelo de negocio
- El Business Owner puede ver tendencias, no solo hechos puntuales
- Los KPIs resumen la salud del negocio en métricas clave
- El aging de Accounts Receivable identifica problemas de cobranza
- La rentabilidad por Customer permite tomar decisiones sobre qué trabajo priorizar

### Invariante absoluta de esta fase
Analytics NUNCA modifica datos. Es la única fase que es 100% lectura sin ninguna excepción posible.

### El modelo de Analytics

```
Domain Events ──────► Analytics Store ──────► Read Models
(de todos los           (separado de               │
 dominios anteriores)   las colecciones          KPIs (escalares)
                        operativas)           Datasets (multi-fila)
                                              Forecasts (Fase 11)
```

---

## Fase 6 — El negocio conoce su costo real

**La pregunta de negocio que responde:**
> ¿Cuánto gasto para generar mi revenue? ¿Cuál es mi margen real?

### Qué cambia en el modelo de negocio
- El P&L ya incluye el lado de los gastos, no solo los ingresos
- Los Suppliers emergen como el opuesto conceptual de los Customers
- El Business puede aprobar gastos del equipo antes de registrarlos

### Nuevos conceptos que se agregan al Business Model

| Concepto | Descripción breve |
|---|---|
| `Expense` | Un gasto operativo del Business — desembolso por bienes o servicios adquiridos |
| `Supplier` | La empresa o persona de quien el Business compra (opuesto de Customer) |
| `SupplierBill` | La factura que el Supplier le envía al Business (Accounts Payable) |

### Lo que NO cambia
Billing, Work, Calendar, Identity, Business — absolutamente nada. Solo se agregan nuevas PostingRules al Financial domain.

---

## Fase 7 — El negocio concilia su dinero real

**La pregunta de negocio que responde:**
> ¿Lo que muestra el sistema coincide exactamente con mi cuenta bancaria?

### Qué cambia en el modelo de negocio
- El Business puede importar movimientos bancarios y conciliarlos con Payments y SupplierPayments
- La diferencia entre "lo que el sistema dice" y "lo que hay en el banco" se vuelve detectable y resoluble

### Nuevo concepto

| Concepto | Descripción breve |
|---|---|
| `BankTransaction` | Un movimiento bancario importado desde el banco del Business |

### Regla clave de esta fase

Un BankTransaction es evidencia bancaria externa. La reconciliación es un match — no una corrección. Un BankTransaction nunca modifica un Payment ni un SupplierPayment existente.

---

## Fase 8 — El negocio conoce el valor real de sus activos

**La pregunta de negocio que responde:**
> ¿Cuánto valen realmente las cosas que poseo? ¿Cuánto se ha depreciado mi equipamiento?

### Nuevo concepto

| Concepto | Descripción breve |
|---|---|
| `FixedAsset` | Un activo físico del Business con vida útil definida y depreciación automática |

### Invariante de esta fase
La depreciación es un proceso automático periódico. El Business Owner no hace asientos manuales de depreciación. El sistema los genera mensualmente desde las PostingRules correspondientes.

---

## Fase 9 — El negocio tiene empleados

**La pregunta de negocio que responde:**
> ¿Cuánto le pago a mi equipo y cómo cumplo con mis obligaciones legales de empleador?

### Nuevo concepto

| Concepto | Descripción breve |
|---|---|
| `Employee` | Una persona empleada por el Business. Puede no tener login al ERP |

### Distinción crítica del modelo

```
User     → Quien OPERA el ERP (tiene credenciales, tiene Role)
Employee → Quien RECIBE una nómina del Business

Son conceptos distintos. Pueden coincidir:
  → El Business Owner es User Y puede ser Employee
  → Un Staff es User Y puede ser Employee

Pero no se pueden confundir:
  → Un Employee puede no tener login (trabajador que no usa el portal)
  → Un User puede no ser Employee (el contador externo tiene login pero no recibe nómina)
```

### Pregunta abierta de esta fase

¿Los WorkEvents (horas trabajadas para un cliente) pueden ser la base del cálculo del Payroll (horas a pagar al empleado)? Esta pregunta no tiene respuesta en v1.0 del CBM. Se resuelve antes de iniciar la Fase 9 (ver Puertas de Decisión).

---

## Fase 10 — El negocio vende productos, no solo servicios

**La pregunta de negocio que responde:**
> ¿Puedo vender inventario físico además de servicios? ¿Puedo incluir productos en mis facturas?

### Nuevo concepto

| Concepto | Descripción breve |
|---|---|
| `Product` | Un ítem de inventario que el Business vende |

### La única extensión del dominio Billing en toda la historia del sistema

Un `InvoiceItem` que hoy solo puede referenciar un WorkEvent, podrá referenciar también un Product. Esta es la única modificación al dominio Billing desde la Fase 3 hasta la Fase 10 — y es una extensión menor que no rompe nada existente.

---

## Fase 11 — El negocio predice su futuro

**La pregunta de negocio que responde:**
> ¿Qué pasará con mi negocio el próximo trimestre si continúo así?

### Qué cambia en el modelo de negocio
- El Business obtiene proyecciones probabilísticas de ingresos y flujo de caja
- El sistema puede identificar Customers con alto riesgo de no pago
- Las anomalías en transacciones se detectan automáticamente

### Invariante absoluta de esta fase
ML y Forecasting son siempre opcionales y asíncronos. Ninguna operación de negocio espera ni puede bloquear por una predicción. Si el motor de ML está offline, el ERP opera con normalidad.

---

## La historia de negocio del ERP en 10 años

```
Año 1  (Fases 1-3)   El ERP es operativo:
                      trabajo + facturación + cobranza
                      → Flujo Shift-to-Cash completo

Año 2  (Fase 4)      El ERP tiene contabilidad formal:
                      General Ledger + P&L + Balance Sheet + BAS

Año 2-3 (Fase 5)     El ERP genera inteligencia de negocio:
                      Analytics + KPIs + Reportes programados

Año 3  (Fases 6-7)   El ERP tiene visión completa del flujo de caja:
                      Gastos + AP + Conciliación bancaria

Año 4  (Fases 8-9)   El ERP gestiona recursos y equipo:
                      Activos fijos + Payroll + STP

Año 5  (Fase 10)     El ERP soporta empresas de productos:
                      Inventory + COGS + Gross Profit real

Año 5+ (Fase 11)     El ERP predice y detecta:
                      Forecasting + ML + Anomaly detection
```

---

## Puertas de Decisión

Antes de iniciar cada fase, hay decisiones de modelo que deben estar resueltas. Son decisiones de negocio que afectan el CBM — no decisiones técnicas.

| Antes de | Decisión requerida | Estado |
|---|---|---|
| Fase 4 | ¿Cuáles son las PostingRules estándar para Australia? ¿Qué PostingRules son configurables por Business? | Por resolver en ADR de Fase 4 |
| Fase 4 | ¿Cómo se manejan los Opening Balances de un Business que ya tiene Invoices de Fase 3? ¿Cuál es la estrategia de migración contable? | Por resolver antes de Fase 4 |
| Fase 6 | ¿Los Expenses pueden tener flujo de aprobación multi-nivel o solo un nivel? | Por resolver en DEC de Fase 6 |
| Fase 9 | ¿Un WorkEvent (horas para el cliente) puede ser la base del cálculo de Payroll? ¿O el Payroll tiene su propio registro de tiempo? | Por resolver en DEC de Fase 9 |
| Fase 10 | ¿El COGS se calcula con FIFO o Average Cost? ¿El Business puede elegir? | Por resolver en DEC de Fase 10 |

---

## Riesgos de evolución

| ID | Riesgo | Probabilidad | Mitigación |
|---|---|---|---|
| R-EVO-001 | La Fase 9 (Payroll) puede requerir modificar el Work domain si los WorkEvents se usan para calcular salarios | Alta | Decidir en DEC de Fase 9 si WorkEvent es la base de Payroll o si se define un concepto separado (ej. `TimesheetEntry`) |
| R-EVO-002 | Multi-jurisdicción puede revelar que el FiscalProfile es demasiado específico de Australia | Media | Diseñar el FiscalProfile para ser extensible por jurisdicción desde la Fase 1 — no hardcodear campos australianos |
| R-EVO-003 | Un Business que migra de otro sistema trae datos históricos que no pasaron por FinancialTransactions | Media | Definir una estrategia de Opening Balances antes de la Fase 4 — posiblemente un tipo especial de FinancialTransaction de apertura |
| R-EVO-004 | La Fase 10 (Inventory) extiende InvoiceItem — si Billing tuvo cambios no documentados en Fases 5-9, la extensión puede ser compleja | Baja | Documentar las invariantes de InvoiceItem y de Billing antes de cualquier cambio en esas fases |
| R-EVO-005 | El crecimiento multi-jurisdiccional puede requerir múltiples FiscalProfiles por Business | Media | PO-EVO-001 debe resolverse antes de la primera expansión de jurisdicción |

---

## Preguntas abiertas del modelo

Estas preguntas no tienen respuesta en la versión 1.0 del CBM. Cada una se resuelve antes de la fase en que se vuelve crítica.

| ID | Pregunta | Crítica antes de |
|---|---|---|
| PO-EVO-001 | ¿Un Business puede tener múltiples FiscalProfiles para facturar en múltiples jurisdicciones? | Fase 4 — impacta PostingRules y BAS |
| PO-EVO-002 | ¿Un User puede pertenecer a múltiples Businesses en versiones futuras? (Hoy BR-ID-001 lo prohíbe) | Cualquier expansión de Identity post Fase 1 |
| PO-EVO-003 | ¿Los Workflows de Automation pueden ser configurados por el Business Owner sin código, mediante una UI de reglas? | Fase 3+ |
| PO-EVO-004 | ¿Qué sucede con los datos de un Business archivado después del período de gracia de 30 días? ¿Se eliminan o se mueven a cold storage? | Fase 1 — debe resolverse antes de que haya Businesses archivados en producción |
| PO-EVO-005 | ¿El Payroll de la Fase 9 usa WorkEvents como base o define su propio registro de tiempo independiente? | Fase 9 — impacta el diseño del Work domain |
| PO-EVO-006 | ¿Los Forecasts de la Fase 11 son visibles para el Business Owner en su portal o solo para el Platform Admin como feature de análisis interno? | Fase 11 |

---

## La promesa de la arquitectura al final del camino

Si el CBM se mantiene con disciplina a lo largo de este roadmap, el resultado al año 5 es:

```
Un ERP completo para pequeñas empresas con:

  ✅ Multi-tenancy real — miles de Businesses aislados en la misma plataforma
  ✅ Contabilidad formal en tiempo real — el P&L siempre refleja los hechos actuales
  ✅ Soporte multi-jurisdiccional — agregar Nueva Zelanda es configurar PostingRules, no reescribir código
  ✅ Cobranza automatizada — recordatorios, tracking, alertas sin intervención manual
  ✅ ML predictivo — problemas de flujo de caja detectados antes de que ocurran
  ✅ Código de Billing del Año 1 sin modificar en el Año 5
```

Y el código de Billing del Año 1 sigue siendo el mismo que en el Año 5 — sin refactorizaciones estructurales, sin deuda técnica acumulada por acoplamiento, sin el "no toques eso porque rompe todo".

Esto es posible porque el modelo se diseñó correcto desde el principio.
