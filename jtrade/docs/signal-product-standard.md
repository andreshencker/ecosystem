# jtrade — Estándar de `Product.type = signal`

Estado: **análisis conceptual** (no es diseño de código ni endpoints todavía)
Rama: `codex/grapifly-ecosystem` · Companion de `ea-communication-standard.md`

---

## Regla base del estándar de integración

Todo producto trabaja como mínimo con:

1. **`account.*`** — información y reglas de la cuenta de trading del cliente.
2. **`params.*`** — parámetros específicos del producto, definidos por el proveedor en el
   `manifest` y configurados por el cliente.

Cada `Product.type` agrega capacidades sobre esa base:

- `type = bot` → normalmente `account.*` + `params.*`.
- `type = signal` → `account.*` + `params.*` **+ la capacidad `signal.*`** (este documento).

---

## 1. El flujo completo, anotado

| Paso | Qué pasa | Qué concepto/dato entra en juego |
|---|---|---|
| **1. Provider crea el producto signal** | Nombre, plataforma, precio, manifest, y **la fuente de señales** | Fuente = uno o más *orígenes* (indicador/estrategia). Cada uno con credencial de ingesta, catálogo de canales, política de señal, mapeo de payload |
| **2. Provider configura la fuente** | Declara los **canales** `(símbolo, timeframe, dirección)`, obtiene las claves para pegar en TradingView, define política (TTL, cooldown, acciones, horarios) | Catálogo de canales, `channelId`, claves BUY/SELL (o clave + acción), plantilla de payload, `signalFields[]` en el manifest |
| **3. TradingView / otra fuente envía la alerta** | POST con credencial + datos del evento | Contrato de ingesta (mínimo canónico + extras de la fuente) |
| **4. jtrade recibe** | Guarda el payload crudo, sella `receivedAt`, resuelve credencial → canal | Registro de ingesta (auditoría/replay), resolución `(slug, key)` → `(indicatorId, channelId, action)` |
| **5. jtrade identifica el producto** | El webhook es del **indicador**, no del producto → resuelve el **canal**, luego *qué productos empaquetan ese indicador* | Un signal ≠ product-scoped en la entrada; el fan-out por producto es en la entrega |
| **6. jtrade valida** | Credencial, rate-limit, acción permitida, frescura, deduplicación, símbolo resoluble, reglas de negocio | Ver secciones 7, 8, 9 |
| **7. jtrade crea el `Signal` canónico** | Registro normalizado + `signalId` + `dedupKey` + `expiresAt` | Modelo canónico de señal (sección 5) |
| **8. jtrade determina clientes suscritos** | Órdenes activas en productos que empaquetan el indicador → suscripción por canal → filtros de entitlement | Suscripción = `(order, channel, account)`; chequeos de vigencia |
| **9. jtrade obtiene `account.*`** | De la cuenta de trading del cliente | Estándar base |
| **10. jtrade obtiene `params.*`** | De la config por-canal del cliente (form dinámico del manifest) | Estándar base |
| **11. jtrade entrega al runtime** | Ensambla el envelope, lo sirve por pull (polling) o push; sella `deliveredAt`; espera el callback de resultado | Instancia de entrega por-target + estado + cursor; callback de resultado |

**Salidas válidas que NO son "entrega":**
- Señal *no resoluble* → log + drop + avisar al provider.
- Señal *válida sin suscriptores* → log + no-op.
- Señal *duplicada* → drop / devolver la existente.
- Señal *expirada al llegar* → log + no entregar.

---

## Conceptos que faltaban en la lista inicial

La lista de partida (`webhook, alertId, signalId, action, symbol, timeframe, createdAt,
identificación del origen, deduplicación, expiración`) está incompleta. Faltan:

1. **`channelId`** — ancla estable de suscripción `(indicador, símbolo, timeframe)`. Sobrevive a la rotación de claves. Distinto de `alertId` y de `signalId`. Es "el grupo".
2. **Tiempos separados**, no un solo `createdAt`:
   - `barTime` — apertura de la vela a la que pertenece la señal (lo manda la fuente, clave para dedup)
   - `firedAt` / `sourceTime` — cuándo la fuente la generó
   - `receivedAt` — cuándo jtrade la ingirió
   - `expiresAt` — calculado
   - `deliveredAt` — por-target
3. **`externalId` / `sourceSignalId`** — id de idempotencia de la propia fuente (opcional). Distinto del `signalId` de jtrade.
4. **Set de acciones más allá de BUY/SELL** — `CLOSE`, `CLOSE_LONG`, `CLOSE_SHORT`, `REVERSE`, quizá `MODIFY_SL/TP`, `MOVE_BREAKEVEN`, `PARTIAL_CLOSE`. Define si la clave puede codificar la acción (buyKey/sellKey) o si el payload debe traer `action` explícito.
5. **Mapeo de payload / templating** — los mensajes de alerta de TradingView son texto libre. Hay que definir qué JSON pega el provider (jtrade puede generarlo) y cómo jtrade lo mapea a los campos canónicos.
6. **`signalFields[]` en el manifest** — campos que la *fuente* manda por señal y el runtime necesita (SL sugerido, TP, nivel de grid, fuerza de señal). Distinto de `params.*` (que configura el *cliente*, estático). Van a `signal.custom.*`.
7. **Contexto de precio** — `close`/`bid`/`ask` al disparar. Para medir slippage, base de cálculo de SL/TP.
8. **Contexto de posición de la estrategia** — `isEntry` / `isExit` / `isReversal`, `position_size`. Para que el runtime sepa si abre, cierra o invierte.
9. **Instancia de entrega por-target con estado** — `(signal × subscription)` → `pending | delivered | consumed | expired | superseded | failed`. La entrega es *stateful* por suscriptor.
10. **Cursor de entrega por EA** — el último `signalId` que ese EA/cuenta procesó (idempotencia en la entrega, aparte de la dedup en ingesta).
11. **Supersesión** — una señal más nueva en el mismo canal invalida las `pending` anteriores aunque no hayan expirado.
12. **Callback de resultado** — el EA reporta el fill `(ticket, precio de entrada, slippage, error, cierre)`. Cierra el loop para trazabilidad, P&L y analítica del provider.
13. **Mapeo inverso de símbolo** — cuando jtrade dice "opera EURUSD", el EA necesita el nombre de su broker (`EURUSD.x`). Alias a nivel de cuenta del cliente.
14. **Estado de conexión de la cuenta** — ¿el EA/puente está conectado? Señal que llega con la cuenta offline → ¿se encola o expira? (recomendado: expira).
15. **Vigencia del entitlement a mitad de señal** — trial vencido, suscripción caída, orden cancelada entre que se emite y se entrega.
16. **Política de señal del provider** — horario de trading, fin de semana/feriados, máx señales/día por canal, manejo de señal opuesta (invertir vs ignorar vs cerrar-y-abrir), si la fuente manda solo entradas o también salidas.
17. **Rate-limit + anti-replay en ingesta** — un slug filtrado no debe poder inundar; frescura de `barTime`; HMAC opcional.
18. **Capacidad de "señal de prueba"** — el provider verifica el pipe antes de ir a producción.
19. **Granularidad de suscripción** — por `(order, channel, account)`, no por producto. El cliente elige qué canales sigue y configura `params.*` por canal.
20. **`meta.*` en el envelope** — `productVersion`, `expiresAt`, `deliveryId`, para que el runtime sepa contra qué versión opera y cuándo caduca.

---

## 2. Qué debe configurar el PROVEEDOR

### A nivel de fuente/indicador
- Registrar el/los orígenes (indicador + su `webhookSlug`).
- **Catálogo de canales**: `(símbolo, timeframe)` → obtiene `channelId` + claves. Enable/disable por canal.
- **Set de acciones** que el canal soporta (mínimo BUY/SELL; opcional CLOSE/REVERSE/…).
- **Plantilla de payload** para TradingView (qué poner en el mensaje de la alerta) — jtrade se la genera lista para copiar.
- **Política de señal**:
  - TTL de expiración (override de los defaults por timeframe)
  - Modo de deduplicación (por `externalId` / por `barTime` / por cooldown)
  - Horario de trading / fin de semana / feriados
  - Máx señales por día por canal
  - Manejo de señal opuesta
  - ¿La fuente manda solo entradas, o también salidas?

### A nivel de manifest (producto)
- `params[]` — los parámetros que el cliente configurará (riesgo, SL, RR, ATR, modo de lote…).
- `signalFields[]` — los campos que la fuente manda por señal y que se pasan al runtime.
- Runtime esperado (`mt4-ea`, `mt5-ea`, `ctrader-bot`, …) y validación de versión.

### Herramientas
- Botón "enviar señal de prueba".
- Log de señales por canal (recibidas / validadas / rechazadas con motivo / entregadas a N).

---

## 3. Qué debe configurar el CLIENTE

- **Comprar el producto** (`order`).
- **Conectar una cuenta de trading** → `account.*` (login del broker, plataforma, `canTrade`, límites de drawdown/profit, moneda, apalancamiento, kill-switch).
- **Por cada canal del producto**: elegir si lo sigue, atarlo a una cuenta, y llenar `params.*` (form dinámico del manifest).
- **Enable/pausar por canal** sin borrar la config.
- **Alias de símbolo a nivel de cuenta** (si su broker usa `GOLD` en vez de `XAUUSD`).
- Ver **historial de señales + resultados de ejecución** (qué disparó, si estaba dentro, si el EA ejecutó, P&L).

---

## 4. Qué información debe venir en el WEBHOOK

### Mínimo canónico (jtrade lo necesita para actuar)
- **Credencial** — `slug` (en la URL) + `key` (en el body). Resuelve `(indicador, canal)` y, si la key es direccional, la `action`.
- **`action`** — explícita si el canal soporta más de BUY/SELL; implícita (por la key) si solo entradas.

Todo lo demás se puede **DERIVAR del canal** (símbolo y timeframe salen del `channelId`). Si el
payload los manda igual, se validan contra el canal (o se ignoran).

### Opcional pero muy valioso (lo manda la fuente)
- **`barTime`** — `{{time}}` de TradingView (apertura de vela). Sin esto la dedup cae a cooldown por ventana.
- **`externalId`** — id de idempotencia de la fuente.
- **`price`** — `{{close}}` / `{{open}}` al disparar.
- **Contexto de estrategia** — `{{strategy.market_position}}`, `{{strategy.position_size}}` → `isEntry/isExit/isReversal`.
- **SL/TP sugeridos** — precio o distancia.
- **`signalFields[]` declarados en el manifest** — pasan a `signal.custom.*`.
- **`comment` / `label`** — texto libre.

---

## 5. Qué información debe GENERAR jtrade

### En la ingesta
- `signalId` (único, canónico), `receivedAt`, `dedupKey`, `expiresAt`.
- Registro `Signal` normalizado:
  `{ signalId, indicatorId, channelId, symbol(canónico)+symbolId, timeframe, action, direction,
     barTime, firedAt, receivedAt, expiresAt, price?, strategyContext?, custom{}, externalId?,
     rawPayloadRef }`.
- Referencia al payload crudo (auditoría/replay).

### En el fan-out
- Una **instancia de entrega por suscripción**:
  `{ deliveryId, signalId, subscriptionId, accountId, status, deliveredAt?, consumedAt?, result? }`.
- Cursor de entrega por EA/cuenta.

### En la entrega
- El **envelope ensamblado**: `signal.*` + `account.*` + `params.*` + `signal.custom.*` + `meta.*`
  — en JSON y en string plano `key=value;` (retrocompat).

### Continuo
- Log/auditoría/métricas por canal e indicador.
- Atribución `signal → order → resultado de trade → P&L` (cuando se cierra el callback).
- Salud de la fuente: `webhookLastReceivedAt` por canal, detección de fuente muda.

---

## 6. Identificadores necesarios

| Id | Qué identifica | Quién lo genera |
|---|---|---|
| `productId` | el producto vendible | jtrade |
| `productVersionId` | la versión (manifest + EA) contra la que opera el runtime | jtrade |
| `indicatorId` / `sourceId` | el origen de la señal | jtrade |
| `webhookSlug` | el segmento de URL de ingesta (por indicador) — rotable | jtrade |
| **`channelId`** | `(indicador, símbolo, timeframe)` — ancla estable de suscripción, sobrevive rotación | jtrade |
| `buyKey` / `sellKey` (o `channelKey` + `action`) | la credencial que se pega en TradingView — rotable | jtrade |
| `signalId` | una señal ingerida, canónica | jtrade |
| `externalId` / `sourceSignalId` | el id propio de la fuente (idempotencia) | la fuente (opcional) |
| `dedupKey` | derivado: `hash(channelId, action, barTime)` o `(channelId, externalId)` | jtrade |
| `orderId` | la compra del cliente | jtrade |
| `subscriptionId` | `(order, channel, account)` + params | jtrade |
| `accountId` | la cuenta de trading del cliente | jtrade |
| `deliveryId` | una instancia `(signal × subscription)` | jtrade |
| `eaVersion` + `productVersionId` | la identidad del runtime que hace polling | el EA / jtrade |
| `ticketId` / `positionId` | el trade en el broker (del callback) | el broker vía el EA |

---

## 7. Cómo evitar señales duplicadas

TradingView evalúa condiciones por tick; puede disparar la misma alerta varias veces por vela;
hay reintentos de red; el provider puede tener la condición en 2 alertas.

### Estrategia en capas, por canal (nunca global)
1. **Por `externalId`** — si la fuente manda un id estable: dedup en `(channelId, externalId)`. Lo mejor cuando existe.
2. **Por `barTime`** — dedup en `(channelId, action, barTime)`. "Una señal por canal, por dirección, por vela." Requiere `{{time}}` en el payload.
3. **Cooldown por ventana** — sin `barTime`: dedup en `(channelId, action)` dentro de una ventana del tamaño del timeframe (M15 → 15 min). Es lo que hacía el código viejo.
4. **Hash de contenido** — hash de los campos canónicos normalizados; idéntico dentro de una ventana → drop.
5. **Colapso de opuestas** — BUY y luego SELL en el mismo canal en segundos → probable flip; tomar la última o tratar como `REVERSE`.

Se guarda el `dedupKey` en el `Signal`; en colisión se hace drop (o se devuelve la señal existente).

**Segunda línea:** el cursor por EA en la entrega — aunque un duplicado se cuele en ingesta, el EA
no actúa dos veces.

---

## 8. Cómo manejar expiración

**Por qué:** un "BUY EURUSD" de hace 20 min en M1 no sirve; el mercado se movió; el EA pudo estar offline.

- **TTL por timeframe** — más corto el TF, más corto el TTL. Defaults tipo el código viejo
  (M1 30s · M5 60s · M15 120s · M30 180s · H1 300s · H4 600s · D1 1800s), override del provider.
- **Base del cálculo** — `expiresAt = barTime + TTL` (más estricto) o `firedAt + TTL` si no hay `barTime`.
- **Puntos de chequeo:**
  - En la entrega: si `now > expiresAt` → no entregar, marcar target `expired`.
  - En el EA: re-chequea (skew de reloj, intervalo de polling). El envelope incluye `expiresAt`.
- **Supersesión** — una señal más nueva en el mismo canal marca las `pending` anteriores como
  `superseded`, expiren o no.
- **Gracia** — sumar el intervalo de polling del cliente, o el provider configura "edad máxima para actuar".
- **Llegada tardía** — si la señal llega ya expirada (lag de la fuente): log, no entregar.

---

## 9. Cómo manejar símbolos y aliases

- **Símbolo canónico** — el catálogo de jtrade. Cada uno con `symbol` + `aliases[]`
  (`EURUSD`, `EURUSD.x`, `EURUSDm`, `EUR/USD`…).
- **En ingesta** — el canal referencia `symbolId` canónico, así que la señal ya nace canónica. Si
  el payload manda string de símbolo, se valida que mapee al del canal (o se ignora).
- **En entrega (crítico)** — el EA manda el símbolo de **su broker**. jtrade normaliza:
  1. Match exacto contra canónico o alias.
  2. Fuzzy: quitar sufijos/prefijos comunes (`.`, `#`, `_`, `-`, `m`, `.x`, `pro`, `.raw`).
  3. Override por-cuenta del cliente (su broker usa `GOLD` para XAUUSD).
  4. Falla → el EA recibe "sin mapeo", se loguea para que el cliente lo corrija.
- **Mapeo inverso** — cuando jtrade dice "opera EURUSD", el EA necesita el nombre de su broker. O
  el EA mapea de vuelta, o jtrade guarda el mapa de símbolos por cuenta y manda el string
  específico del broker.
- **Dueños** — el provider mantiene los aliases del catálogo; el cliente agrega overrides a nivel
  de cuenta.

---

## 10. Integración con el estándar base `account.*` + `params.*`

`signal` es una **capacidad de tipo** que se suma al estándar base:

```
Envelope de un producto type=signal:
  account.*        ← cuenta de trading del cliente          (base, todos los tipos)
  params.*         ← config por-suscripción del cliente,
                     schema del manifest                    (base, todos los tipos)
  signal.*         ← LOS campos canónicos de la señal       (capacidad type=signal)
  signal.custom.*  ← campos que la fuente manda,
                     declarados como signalFields[]         (capacidad type=signal)
  meta.*           ← productVersion, expiresAt, deliveryId  (base)
```

- Un `type=bot` no tiene `signal.*` (se auto-dispara). Un `type=signal` **siempre** tiene `signal.*`.
- El **manifest** de un producto signal declara, además de `params[]`: `signalFields[]` + la
  política de señal (acciones, TTL, dedup).
- La **suscripción** de un producto signal es **por canal** `(order, channel, account)`, no por
  producto — porque los productos signal tienen canales y cada uno necesita sus propios `params.*`
  y su estado de enable.
- El **`account.*`** aporta lo que la señal necesita para ejecutarse pero no define: `canTrade`,
  límites de drawdown/profit, estado de conexión, kill-switch, moneda/apalancamiento para el
  cálculo de lote.

---

## Resumen — qué necesita OBLIGATORIAMENTE un `type=signal`

1. **Origen(es)** con credencial de ingesta rotable (`webhookSlug`).
2. **Catálogo de canales** `(símbolo, timeframe)` con `channelId` estable + claves BUY/SELL (o clave + `action`).
3. **Contrato de ingesta** — mínimo canónico (credencial + action) + extras opcionales de la fuente.
4. **Modelo canónico de `Signal`** con los 5 tiempos (`barTime`, `firedAt`, `receivedAt`, `expiresAt`, `deliveredAt`) y `signalId` + `dedupKey`.
5. **Deduplicación** en capas (externalId → barTime → cooldown) + cursor por EA.
6. **Expiración** por TTL + supersesión.
7. **Normalización de símbolos** bidireccional (catálogo + aliases + override por cuenta).
8. **Suscripción por canal** `(order, channel, account)` con `params.*` del manifest.
9. **Instancias de entrega por-target** con máquina de estados.
10. **Envelope** `signal.* + account.* + params.* + signal.custom.* + meta.*`, en JSON y string plano.
11. **Callback de resultado** para cerrar trazabilidad y P&L.
12. **Política de señal del provider** (acciones, horarios, opuestas, máx/día).
13. **Log/auditoría/salud** de la fuente + señal de prueba.
