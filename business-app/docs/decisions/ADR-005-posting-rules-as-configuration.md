# ADR-005: Posting Rules como configuración en base de datos, no como código

**Fecha:** 2026-07-05
**Estado:** Aceptado
**Autor:** Architecture Review Session

---

## Contexto

### El problema de las reglas contables en un ERP multi-jurisdicción

El ERP debe soportar múltiples jurisdicciones fiscales: Australia (GST 10%), Nueva Zelanda (GST 15%), Canadá (HST 13-15% según provincia), Reino Unido (VAT 20%), España (IVA 21%), y potencialmente otras.

Cada jurisdicción tiene reglas específicas sobre:
- Qué cuentas usar para ingresos, gastos, y impuestos
- Cómo calcular los componentes de impuesto (inclusivo vs exclusivo)
- Qué tipos de gastos son deducibles
- Qué cuentas afecta un pago de impuesto al fisco

Además, las leyes fiscales cambian: Australia ajustó el GST en 2000; puede ajustarse de nuevo. La pregunta es: ¿dónde viven estas reglas?

### Opciones de diseño

**Opción A — Reglas como código (if/switch hardcoded)**

```typescript
// AccountingEngine con lógica jurisdiccional en código
function generateJournalLines(tx: FinancialTransaction): JournalLine[] {
  if (tx.type === 'INVOICE_ISSUED') {
    if (tx.jurisdiction === 'AU') {
      return [
        { accountCode: '1100', type: 'debit',  amount: tx.grossAmount },  // AR
        { accountCode: '4000', type: 'credit', amount: tx.netAmount },     // Revenue
        { accountCode: '2200', type: 'credit', amount: tx.taxAmount },     // GST Collected
      ];
    } else if (tx.jurisdiction === 'NZ') {
      return [
        { accountCode: '1100', type: 'debit',  amount: tx.grossAmount },  // AR
        { accountCode: '4000', type: 'credit', amount: tx.netAmount },     // Revenue
        { accountCode: '2201', type: 'credit', amount: tx.taxAmount },     // GST Collected NZ
      ];
    } else if (tx.jurisdiction === 'CA') {
      // ... 50 líneas más
    } else if (tx.jurisdiction === 'GB') {
      // ... 50 líneas más
    }
    // ... cada jurisdicción
  } else if (tx.type === 'PAYMENT_RECEIVED') {
    // ... misma proliferación de if/else
  }
  // ... 20 tipos de transacción × 10 jurisdicciones = 200 bloques de código
}
```

Consecuencias:
- (+) Explícito — se puede leer el código y ver exactamente qué pasa
- (+) Validación en tiempo de compilación
- (-) El AccountingEngine necesita un deploy para cada cambio fiscal
- (-) Añadir soporte para una nueva jurisdicción requiere modificar el engine
- (-) Las reglas de 10 jurisdicciones × 20 tipos de transacción = 200 bloques de código
- (-) Un error en las reglas de Australia puede romper las de Nueva Zelanda (mismo archivo)
- (-) Imposible que un contador no-developer configure nuevas reglas
- (-) Las reglas no pueden tener efectividad temporal (¿cómo manejar una tasa que cambia el 1 de julio?)

**Opción B — Reglas en archivos de configuración (YAML/JSON)**

```yaml
# posting-rules-AU.yaml
- type: INVOICE_ISSUED
  jurisdiction: AU
  effectiveFrom: 2026-01-01
  lines:
    - account: "1100"
      side: debit
      basis: gross
    - account: "4000"
      side: credit
      basis: net
    - account: "2200"
      side: credit
      basis: tax
```

Consecuencias:
- (+) Sin código de negocio en el engine
- (+) Configurable por un contador
- (-) Requiere un deploy para agregar/modificar reglas (están en el repositorio)
- (-) No hay UI para que el Platform Admin configure nuevas reglas
- (-) Los archivos YAML crecen con cada jurisdicción
- (-) No hay historial de cambios visible para auditores (solo git log)

**Opción C — Posting Rules como registros en base de datos**

```
PostingRule {
  ruleId:          UUID
  transactionType: 'INVOICE_ISSUED'
  jurisdiction:    'AU'
  effectiveFrom:   '2026-01-01'
  effectiveTo:     null  // vigente actualmente
  isActive:        true
  lines: [
    { accountRole: 'ACCOUNTS_RECEIVABLE', side: 'debit',  basis: 'gross' },
    { accountRole: 'REVENUE',             side: 'credit', basis: 'net'   },
    { accountRole: 'TAX_LIABILITY',       side: 'credit', basis: 'tax'   },
  ]
}
```

El `accountRole` no es un código de cuenta específico. El PostingEngine resuelve el código real desde el Chart of Accounts del Business usando el rol.

Consecuencias:
- (+) Cero deploy para cambiar o agregar reglas fiscales
- (+) El Platform Admin puede configurar nuevas jurisdicciones desde la UI
- (+) Historial de cambios con `effectiveFrom`/`effectiveTo` (audit trail fiscal)
- (+) Se pueden configurar overrides por Business (ej. estructura contable personalizada)
- (-) Complejidad de implementación mayor (CRUD de Posting Rules en Platform admin)
- (-) El AccountingEngine necesita resolver la regla en runtime (una query adicional)
- (-) Las reglas en base de datos pueden tener errores que solo se detectan en producción

---

## Decisión

**Las Posting Rules son registros en base de datos (Opción C).**

Las reglas estándar por jurisdicción las gestiona el Platform Admin. Los Businesses pueden tener overrides específicos si su estructura contable difiere del estándar.

---

## Justificación

### 1. Las leyes fiscales cambian — el código no debe cambiar con ellas

La ley de GST de Australia fue modificada múltiples veces desde su introducción en 2000. Cada modificación en un sistema con reglas hardcoded requeriría un deploy. En un SaaS con miles de Businesses, un deploy de estas características requiere una ventana de mantenimiento y afecta a todos los usuarios.

Con Posting Rules en base de datos, el cambio es una actualización de un registro con la fecha de vigencia correcta. El AccountingEngine selecciona automáticamente la regla vigente para cada transacción según su `transactionDate`.

### 2. Soporte multi-jurisdicción sin modificar el engine

```
SIN Posting Rules en DB:
  Agregar soporte para España (IVA 21%) → modificar AccountingEngine → deploy

CON Posting Rules en DB:
  Agregar soporte para España → Platform Admin crea 20 PostingRules para jurisdiction='ES' → sin deploy
```

El AccountingEngine ya puede procesar transacciones españolas. Solo necesita que existan las reglas en la base de datos.

### 3. Los contadores pueden validar y configurar las reglas

Un contador certificado puede revisar las Posting Rules en la UI del Platform Admin y verificar que las cuentas son correctas. No puede revisar código TypeScript. Con reglas en base de datos, el dominio de expertise del contador es suficiente para auditar y corregir las reglas.

### 4. Efectividad temporal con fechas de vigencia

```
PostingRule para INVOICE_ISSUED, AU:
  Version 1: effectiveFrom=2000-07-01, effectiveTo=2025-06-30 (GST 10%)
  Version 2: effectiveFrom=2025-07-01, effectiveTo=null       (GST 12% — hipotético)

El AccountingEngine para una invoice con fecha 2025-07-15:
  → Selecciona la regla con effectiveFrom <= 2025-07-15 AND (effectiveTo IS NULL OR effectiveTo >= 2025-07-15)
  → Aplica la versión 2 correctamente
```

---

## Diseño del accountRole como indirección

Las `PostingRule.lines` usan `accountRole` en lugar de `accountCode` directamente. Esto es crítico:

```
// SIN accountRole — problema:
PostingRule.lines = [
  { accountCode: '1100', side: 'debit', basis: 'gross' }
]
// Problema: el Business A tiene AR en cuenta '1100', el Business B en cuenta '11000'
// ¿Cómo la misma PostingRule funciona para ambos?

// CON accountRole — solución:
PostingRule.lines = [
  { accountRole: 'ACCOUNTS_RECEIVABLE', side: 'debit', basis: 'gross' }
]
// El PostingEngine resuelve 'ACCOUNTS_RECEIVABLE' → accountCode del Business
// Business A: 'ACCOUNTS_RECEIVABLE' → '1100'
// Business B: 'ACCOUNTS_RECEIVABLE' �� '11000'
// La misma PostingRule funciona para todos los Businesses de la jurisdicción
```

Los `accountRole` son un vocabulario estable definido por la plataforma:

| Role | Descripción |
|---|---|
| `ACCOUNTS_RECEIVABLE` | Activo — deudas de clientes |
| `ACCOUNTS_PAYABLE` | Pasivo — deudas con proveedores |
| `REVENUE` | Ingresos operativos |
| `COST_OF_SALES` | Costo directo de ventas |
| `EXPENSE_GENERAL` | Gastos generales |
| `TAX_LIABILITY` | GST/IVA/VAT a pagar |
| `TAX_ASSET` | GST/VAT claimable |
| `BANK` | Cuenta bancaria principal |
| `WAGES_EXPENSE` | Gasto en nómina |
| `SUPER_LIABILITY` | Superannuation a pagar (AU) |
| `FIXED_ASSETS` | Activos fijos |
| `ACCUMULATED_DEPRECIATION` | Depreciación acumulada |

Cada Business mapea estos roles a sus códigos de cuenta específicos en el Chart of Accounts.

---

## Validación de reglas

Las Posting Rules deben validarse al guardarse:

```
Validaciones de una PostingRule:
1. Las bases de las líneas deben cuadrar: sum(debit bases) = sum(credit bases)
   Para INVOICE_ISSUED: 'gross' debit = 'net' credit + 'tax' credit ✓
2. Todos los accountRoles referenciados existen en el catálogo
3. No puede haber dos PostingRules activas para el mismo (type, jurisdiction) en el mismo período
4. effectiveTo > effectiveFrom si ambas están definidas
```

Esto garantiza que el AccountingEngine nunca intente procesar una regla que produciría un asiento desbalanceado.

---

## Jerarquía de reglas

```
Platform Default Rules (globales por jurisdicción)
    └── Business Override Rules (específicas del Business, si existen)
            └── Template Rules (derivadas de platilla al crear el Business)
```

El AccountingEngine busca en este orden:
1. ¿Hay una Override Rule para este (type, jurisdiction, businessId)?
2. ¿Hay una Platform Default Rule para este (type, jurisdiction)?
3. Rechazar la transacción con `TransactionRejected` — no existe regla

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Regla mal configurada produciendo asientos desbalanceados | Baja | Alto | Validación en save + validación en AccountingEngine antes de postear |
| Ausencia de regla para jurisdicción nueva | Media | Medio | `TransactionRejected` event + alerta al Platform Admin |
| Performance de query de Posting Rule en runtime | Baja | Bajo | Cache de Posting Rules activas por (type, jurisdiction). TTL de 15 min. |
| Conflicto entre regla de plataforma y override del Business | Baja | Medio | Override tiene prioridad explícita. Log de qué regla fue seleccionada. |

---

## Consecuencias

### Positivas
- Cambios fiscales son operacionales, no de código
- Soporte multi-jurisdicción sin modificar el AccountingEngine
- Los contadores pueden revisar y auditar las reglas sin leer código
- Historial auditeable de cambios de reglas con fechas de vigencia

### Negativas
- El Platform Admin UI necesita un módulo para gestionar Posting Rules (complejidad de UI)
- Los errores en reglas solo se detectan cuando el AccountingEngine intenta usarlas
- Un Business con necesidades contables muy específicas puede requerir trabajo del Platform Admin para configurar sus overrides

---

## Documentos relacionados

- `docs/domain/accounting/04-posting-engine.md` — Diseño detallado del Posting Engine
- `docs/domain/accounting/05-accounting-domain.md` — Entidades del dominio contable
- `ADR-003-financial-transaction-bridge.md` — Por qué FinancialTransaction es el contrato
- `docs/architecture/10-evolution-roadmap.md` — Nuevos tipos de transacción que necesitarán reglas
