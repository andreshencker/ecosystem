# 01 — The Financial Domain

**Versión:** 1.0 | **Fecha:** 2026-07-05 | **Estado:** Diseño conceptual

---

## El problema que resuelve

Un ERP sin contabilidad es una herramienta operativa. Registra lo que pasa. Un ERP con contabilidad es la fuente de verdad financiera del negocio. Responde no solo *qué pasó* sino *cuánto vale*, *a quién se debe*, *cuánto se posee*, y *cuál es la posición financiera real* del negocio en cualquier momento.

La diferencia entre los dos no es una pantalla de asientos contables. Es una capa de transformación que convierte hechos operativos en lenguaje financiero universal.

Sin esta capa:
- Saber cuánto facturo un Business en un trimestre requiere sumar facturas.
- Saber cuánto se le debe a proveedores requiere revisar emails.
- Saber la utilidad real requiere una hoja de Excel manual.
- Preparar la declaración de impuestos requiere un contador externo que reconstruye todo desde cero.

Con esta capa:
- La posición financiera existe en tiempo real.
- Los reportes se generan automáticamente desde datos ya existentes.
- Los impuestos se calculan con cada transacción, no al final del año.
- El negocio conoce su realidad financiera sin salir de la aplicación.

---

## Por qué existe el Financial Engine

El Financial Engine existe porque **los módulos operativos no deberían conocer contabilidad** — y la contabilidad no debería conocer los módulos operativos.

Esto no es una preferencia de diseño. Es una separación de dominios que tiene consecuencias profundas:

### Argumento 1 — La lógica contable es transversal

Cuando se emite una factura, hay contabilidad.
Cuando se recibe un pago, hay contabilidad.
Cuando se registra un gasto, hay contabilidad.
Cuando se compra un activo, hay contabilidad.
Cuando se paga salarios, hay contabilidad.
Cuando se ajusta el inventario, hay contabilidad.

Si cada módulo implementa su propia lógica contable, la lógica se duplica, se fragmenta, y diverge. El módulo de facturas tiene una versión de "cómo registrar" y el módulo de pagos tiene otra. Cuando cambian las reglas fiscales de un país, hay que actualizar seis módulos distintos.

El Financial Engine centraliza esa lógica una sola vez.

### Argumento 2 — Las reglas contables cambian de forma independiente

Las leyes fiscales de Australia en 2026 no son iguales a las de 2020. Tampoco son iguales a las de Nueva Zelanda, Canadá o España.

Si la lógica contable vive dentro de Billing, cambiar la tasa de GST o agregar soporte para un nuevo país requiere modificar el módulo de Billing, el de Expenses, el de Payroll, y todos los demás.

Si la lógica contable vive en el Financial Engine, cambiar una jurisdicción fiscal es un cambio en un solo lugar: las Posting Rules.

### Argumento 3 — Los módulos operativos tienen su propia coherencia

Billing se preocupa por emitir documentos financieros correctos y rastrear su estado.
Payments se preocupa por registrar cobros y actualizar balances de facturas.
Work Management se preocupa por registrar tiempo trabajado.

Ninguno de estos módulos debería tener que saber qué es un débito, qué es un crédito, o qué cuenta del Chart of Accounts corresponde a "Ingresos por servicios prestados".

Mezclar esa responsabilidad contamina el módulo y lo hace frágil ante cambios contables.

### Argumento 4 — La auditoría requiere una fuente de verdad independiente

Los auditores necesitan reconstruir la historia financiera completa sin depender de la UI operativa. El General Ledger es esa fuente de verdad. Si el General Ledger es un derivado de los módulos operativos, puede ser recalculado, corregido y verificado de forma independiente.

Si los asientos contables viven dentro del módulo de Billing, un error en Billing contamina directamente los registros contables. Con el Financial Engine como capa independiente, los registros contables pueden verificarse contra las transacciones de origen sin depender de la lógica del módulo.

---

## Por qué Billing no debería generar asientos

Billing conoce:
- Qué se facturó a quién
- A qué precio
- Con qué fecha de vencimiento
- Cuánto fue pagado

Billing no debería conocer:
- Que una factura emitida crea un débito en "Cuentas por cobrar" y un crédito en "Ingresos"
- Que el GST de esa factura crea un débito en "Activos por impuesto" o un crédito en "IVA a pagar"
- Que cuando la factura es pagada, hay que revertir las cuentas por cobrar
- Que en Australia ese tratamiento es diferente a en Canadá

Si Billing genera asientos:
- Billing debe importar Chart of Accounts
- Billing debe importar Posting Rules
- Billing debe conocer la jurisdicción fiscal del Business
- Billing debe actualizarse cada vez que cambia la ley fiscal
- Billing se vuelve imposible de testear sin una configuración contable completa

El test de una factura debería ser: *¿Se generó el documento correcto para el cliente correcto con el monto correcto?* No: *¿Se registró el débito en la cuenta 1100 y el crédito en la cuenta 4000?*

---

## Por qué Payments no debería conocer el libro mayor

Payments conoce:
- Que se recibió dinero
- De quién
- Cuánto
- Cuándo
- Contra qué factura

Payments no debería conocer:
- Que ese dinero entra como débito en "Caja/Banco"
- Que ese mismo movimiento cancela un saldo en "Cuentas por cobrar"
- Que si hay pago parcial, solo se cancela parcialmente la cuenta
- Que si el pago está en moneda extranjera, hay diferencias de cambio que se contabilizan por separado

Si Payments genera asientos:
- Un bug en el módulo de pagos puede crear asientos descuadrados
- Cambiar la política de diferencias de cambio requiere modificar el módulo de pagos
- Payments debe conocer el estado actual del ledger para verificar que no hay doble contabilización

La regla es absoluta: los módulos operativos generan *hechos financieros normalizados*, no entradas contables.

---

## La responsabilidad única del Financial Engine

> **El Financial Engine transforma hechos financieros normalizados en registros contables balanceados.**

Esta frase contiene cuatro conceptos distintos:

**Hechos financieros normalizados** — El Financial Engine recibe eventos de cualquier módulo en un formato común. No recibe facturas ni pagos: recibe `FinancialTransaction` con un tipo, un monto, una fecha, y referencias al origen.

**Registros contables** — El resultado son `JournalEntry` que siguen las reglas de la partida doble: cada registro tiene al menos una línea de débito y una de crédito, y el total de débitos iguala el total de créditos.

**Balanceados** — El Financial Engine rechaza cualquier transformación que no produzca un asiento cuadrado. Si una Posting Rule está mal configurada y produciría un asiento descuadrado, es un error que debe resolverse en las reglas, no en el módulo operativo.

**Desde cualquier módulo** — Esta es la propiedad más importante. El mismo motor procesa transacciones de Billing, Payments, Expenses, Payroll, Inventory, y cualquier módulo futuro. No hay código contable en ningún módulo operativo.

---

## Qué significa "Financial Engine" versus "módulo de contabilidad"

Un **módulo de contabilidad** es una pantalla donde los contadores entran asientos manualmente. Es lo que tienen los sistemas legacy.

Un **Financial Engine** es un motor que:
1. Recibe hechos financieros de múltiples orígenes
2. Los transforma automáticamente en asientos contables
3. Mantiene el General Ledger siempre actualizado
4. Genera reportes financieros en tiempo real
5. Soporta múltiples jurisdicciones fiscales
6. Es completamente invisible para el usuario operativo

La diferencia es la dirección del flujo. En un módulo de contabilidad, el contador es quien produce los asientos. En un Financial Engine, los asientos son la consecuencia automática de las operaciones del negocio.

Los asientos manuales existen solo para correcciones y ajustes — no como flujo principal.

---

## La promesa del Financial Engine

Si este motor se implementa correctamente:

- Un carpenter que emite su primera factura no necesita saber qué es una cuenta T.
- El sistema genera automáticamente su P&L, su balance, y su posición de GST.
- Cuando llega junio, la declaración de impuestos es un reporte, no un proceso de reconstrucción.
- Cuando Invoice App expande a Nueva Zelanda, se agrega un conjunto de Posting Rules para NZ — sin tocar Billing, Payments, ni Expenses.
- Cuando en el futuro se integra un sistema de inventario, sus transacciones fluyen por el mismo motor.

El Financial Engine no es el módulo más visible. Es el que hace posible que todos los demás módulos tengan significado financiero sin contaminarse de complejidad contable.
