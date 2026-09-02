# jtrade — Signal: piezas del rompecabezas + mapa de migración

Estado: **análisis** · Rama: `codex/grapifly-ecosystem`
Companion de `ea-communication-standard.md` y `signal-product-standard.md`

---

## Premisa

Cada `Product.type` monta un flujo distinto. **`signal` ≠ `bot`.**
Este documento cierra **solo el flujo de `signal`**.

El código legacy (orchestrator + `signals` + `alerts` + `symbol-executions` + `user-account-info`
+ `indicator-projects` + `admin-indicators`) **no fue pensado para un marketplace**. Se construyó
para una sola cosa: *leer señales de TradingView y abrir operaciones en MT5*. No tiene productos,
precios, órdenes, entitlement, manifest, ni fan-out a varios clientes.

---

## 1. Cómo funciona HOY el código (legacy)

### 1.1 Ingesta — qué hace que una alerta de TradingView sea válida y se asocie

`POST /signals/mt5` (sin JWT) · body: `{ webHookKey, alertId }`

`SignalsService.createMt5Signal`:

1. **`validateAdminIndicatorWebhook(webHookKey)`**
   `AdminIndicator.findOne({ webhookKey })` → popula `indicatorProjectId`.
   Devuelve `{ ok, adminIndicatorId, indicatorProjectId, indicatorId, projectCodePlatformId, isActive }`.
   `ok = adminIndicator.isActive && indicatorProject.isActive`.
2. **`Alert.findOne({ _id: alertId, isActive: true })`** → el doc de alerta (trae `symbol`, `timeFrame`, `action`, `indicatorProjectId`).
3. **Asociación**: `validation.indicatorProjectId === alert.indicatorProjectId`.
   → esto es lo único que ata la credencial del webhook a la alerta.
4. `normalizeSymbol(alert.symbol)` vía el mapa de aliases.
5. **Cooldown/dedup**: `Signal.findOne({ symbol, timeFrame, action, createdAt: { $gte: now - cooldownMs } })` → si existe, la devuelve.
6. Crea `Signal { signalId: randomUUID(), adminIndicatorId, alertId, indicatorId: alert.indicatorProjectId, action, symbol, timeFrame }`.

**Cadena de asociación legacy:**
`webhookKey → admin_indicator → indicator_project → (indicator + project_code_platform)`
El `project_code_platform` = `(code_project + platform)`. El `code_project` es lo más parecido a
un "producto", **pero no hay producto/precio/orden**.

### 1.2 Entrega — cómo el EA obtiene la señal

`POST /signals/mt5/getSignalInformation` · body: `{ symbol, accountNumber, timeFrame, latestSignalId, eaVersion, eaVersionId }`

`getMt5SignalInformation`:

1. **`isEaVersionValid(eaVersion, eaVersionId)`** → `CodeProjectVersion.findOne({ projectCodePlatformId: eaVersionId })`, chequea `isActive && eaVersion === versionDoc.version`.
2. `normalizeSymbol(symbol)` — símbolo del broker → canónico.
3. **`getByAccountRef(accountNumber, symbol, timeFrame)`**:
   `UserAccountInfo.findOne({ accountRef: accountNumber })` → **el número de cuenta ES la credencial** (sin token, sin auth).
   Popula `userProjectPlatform → projectCodePlatform → platform` y `indicatorProject → indicator`.
   Carga los `symbol_executions` de esa cuenta → arma `subscriptions[]` con `buyId`/`sellId`/riesgo.
   Devuelve `{ id, accountRef, canTrade, isActive, useDrawdownLimit, useProfitLimit, maxDrawdownPercent, maxProfitPercent, platform, indicatorProjectId, indicator, subscriptions }`.
4. `Signal.findOne({ symbol, timeFrame, indicatorId: account.indicatorProjectId }).sort({ createdAt: -1 })` — última señal del indicator-project de esa cuenta.
5. Si `signal.signalId === latestSignalId` → `"Signal already exists"` (dedup por-EA).
6. `subscription = subscriptions.find(s => s.symbol === symbol && s.timeFrame === timeFrame)`.
7. Chequea `subscription.isActive`.
8. Expiración: `ageMs > getSignalExpirationMs(timeFrame)` → `"Signal expired"`.
9. Arma el string `key=value;` (19 campos, hardcodeado en `signals.service.ts`).

### 1.3 El orchestrator

`GET /orchestrator/signals/mt5/latest` → `CoreClient.getSignalInformation()` → `POST {backend}/signals/mt5/getSignalInformation`.
**Proxy passthrough puro.** No agrega lógica. El `cache`, el `SignalDto` y `updateSignalPlatformResult`
(callback de resultado) están muertos. Binance está fuera de alcance.

---

## 2. Mapa de pertenencia — OLD → NEW

| Pieza legacy | Qué hace | Nuevo hogar |
|---|---|---|
| `company_provider` | identidad del proveedor | Grapifly Organization |
| `indicator` (old) | nombre/key de la fuente | `Indicator` (new: + `webhookSlug` + `pairs[]`) |
| `indicator_project` (companyProvider × projectCodePlatform × indicator) | ata indicador a código-en-plataforma | `Product` (`type=signal`, `platformId`) + `Product.indicatorIds[]` |
| `admin_indicator` (`webhookKey` + secreto cifrado, 1:1 indicator_project) | credencial de ingesta | **`Indicator.webhookSlug`** (movido, simplificado) ✅ hecho |
| `alert` (indicatorProjectId × symbolId × timeFrame × action; `groupId`; doc BUY + doc SELL) | el canal + los ids que se pegan en TV | **`Indicator.pairs[]`** (`channelId` = `pair._id` ≈ `groupId`; `buyKey`/`sellKey` ≈ BUY id / SELL id) ✅ hecho |
| `signal` (signalId, adminIndicatorId, alertId, indicatorId=projectId, action, symbol, timeFrame) | una señal ingerida | **nueva colección `signals`** — Fase B |
| `code_project` / `project_code_platform` / `code_project_version` | código del bot + versiones por plataforma | `Product` + `ProductVersion` (storage de archivo) ✅ parcial |
| `user_platform` (userId × platformId, status) | plataforma conectada del cliente | parte de **`client-accounts`** — Fase C |
| `user_project_platform` (userId × projectCodePlatform, `subscribedAt`, `lastDownloadAt`) | cliente suscrito a un bot/EA | **`order`** (la compra) ✅ — falta tracking de descarga |
| `user_account_info` (userProjectPlatformId, indicatorProjectId?, `accountRef`, `canTrade`, límites) | cuenta de trading del cliente | **`client-accounts`** — Fase C |
| `symbol_executions` (userAccountInfoId × alertGroupId; contractSize, riskPercent, SL/TP/ATR…) | config de ejecución por-canal del cliente | **`channel-subscriptions`** — Fase D (pero con `params.*` del manifest, no columnas fijas) |
| orchestrator `signals/mt5/latest` | proxy al backend | **borrar** — se pliega al backend `ea-gateway` — Fase E |
| orchestrator `core.client.getSignalInformation` | llamada HTTP al backend | **borrar** |
| orchestrator `core.client.updateSignalPlatformResult` (muerto) | callback de resultado de trade | **`ea-gateway` `POST /result`** — Fase E, opcional |
| orchestrator `binance/*` | ejecución crypto | **borrar entero** |
| `signals.service.normalizeSymbol` + `symbolMap` | resolución de aliases | **conservar** — portar a `symbols` (ya tiene `aliases[]`, hoy sin consumir) |
| `signals.service.getSignalCooldownMs` / `getSignalExpirationMs` | timing por TF | **conservar** — portar |
| `signals.service.isEaVersionValid` | check de versión del EA vs `code_project_version` | **portar** → chequear vs `ProductVersion` |

---

## 3. El gap — qué NO existe porque no era un marketplace

- **Sin productos / precio / orden / entitlement.** `user_project_platform` = "estás suscrito" es un
  booleano, no una compra pagada.
- **`accountNumber` se confía a ciegas.** Sin token por cuenta.
- **Sin manifest.** El string `key=value;` está hardcodeado; todo producto usa esos campos exactos.
- **Sin `params.*`.** Los parámetros de ejecución viven en `symbol_executions` con columnas fijas
  (`contractSize`, `riskPercent`, …). Un dev no puede declarar los suyos.
- **Sin fan-out.** La entrega es 1 indicator-project → sus señales. No reparte a varios productos/
  clientes según compras.
- **Sin loop de resultado.** El hook existe, nadie lo llama.
- **Webhook por indicator-project** (indicador+plataforma) → el mismo indicador en 2 plataformas =
  2 webhooks = 2× setup en TradingView. ✅ ya corregido (webhook en el indicador).

---

## 4. Las piezas del rompecabezas (signal)

### 4.1 Qué hace el PROVEEDOR

1. Crea un `Product` con `type = signal`, elige plataforma, sube el EA (`ProductVersion` + `manifest`).
2. Crea/reutiliza `Indicator`(es), los empaqueta en el producto (`indicatorIds[]`).
3. Por indicador: define los **canales** `(símbolo, timeframe)` → obtiene `channelId` + `buyKey`/`sellKey` + la URL del webhook.
4. En el **manifest** (dentro del bundle del EA): declara
   - `params[]` — lo que configura el cliente
   - `signalFields[]` — lo que la fuente manda por señal
   - política de señal (acciones, TTL, dedup, horarios)
5. Configura las alertas de TradingView: URL del webhook + el payload que jtrade le genera
   (`{"key":"<buyKey|sellKey>", "time":"{{time}}", ...}`).
6. Pone precio, publica.
7. Monitorea: log de señales, salud de la fuente, nº de suscriptores.

### 4.2 Dónde define el proveedor las variables que necesita

| Variable | Dónde se define |
|---|---|
| `params.*` (config del cliente) | `jtrade.manifest.json` dentro del bundle de `ProductVersion` (parseado al subir). Fallback: a mano en el form del producto |
| `signalFields.*` (envía la fuente) | mismo manifest |
| Identidad de canal (símbolo, timeframe) | página de Alerts, por indicador |
| Política de señal (TTL, dedup, acciones, horarios) | config del indicador/fuente |
| Plantilla de payload de TradingView | la genera jtrade a partir del canal |

### 4.3 Cómo funciona el signal (el estándar)

```
INGESTA
  POST /webhooks/tv/:indicatorSlug   { key, [time], [externalId], [price], [action], ... }
    → resolver (slug, key) → (indicatorId, channelId, action)
    → validar: credencial, rate-limit, acción permitida, frescura
    → dedup (externalId → barTime → cooldown)
    → crear Signal canónico  { signalId, indicatorId, channelId, symbol+symbolId, timeframe,
                               action, direction, barTime, firedAt, receivedAt, expiresAt,
                               price?, strategyContext?, custom{}, externalId?, rawPayloadRef }

FAN-OUT
  para cada order ACTIVA en un Product que empaqueta el indicador
    para cada channel-subscription que hace match del canal
      → chequear entitlement (order vigente, trial/periodo ok)
      → crear delivery  { deliveryId, signalId, subscriptionId, accountId, status: pending }

ENTREGA (pull)
  GET /ea/signal   { token, symbol(broker), timeframe, lastSignalId, eaVersion, productVersionId }
    → validar token → client-account
    → validar versión del EA vs ProductVersion
    → normalizar símbolo (aliases + override por cuenta)
    → buscar la última delivery: pending, no expirada, no superseded, no consumida
    → ensamblar envelope:  signal.* + account.* + params.* + signal.custom.* + meta.*
    → responder JSON  o  string plano key=value;
    → marcar delivery: delivered

CALLBACK
  POST /ea/result  { token, deliveryId, ticket, entryPrice, slippage, error?, closeInfo? }
    → marcar delivery: consumed | failed
    → ligar delivery → order → P&L  (analítica del proveedor)
```

### 4.4 Qué hace el CLIENTE

1. Compra el producto (`order`).
2. Conecta una cuenta de trading (`client-account`: login del broker, plataforma, `canTrade`,
   límites drawdown/profit, moneda, apalancamiento → obtiene un **token por cuenta**).
3. Por cada canal del producto: se suscribe, lo ata a una cuenta, llena `params.*` (form dinámico
   del manifest), lo activa.
4. Instala el EA, lo configura con el `token` de la cuenta + el `productVersionId`.
5. Opcional: overrides de alias de símbolo por cuenta.
6. Monitorea: historial de señales + resultados de ejecución.

---

## 5. Qué resolver para la migración (signal + orchestrator)

| # | Tarea | Fase |
|---|---|---|
| 1 | **Borrar el orchestrator** entero (proxy MT5 + Binance + infra). Nada en el repo lo referencia | ahora |
| 2 | **Auth del EA**: reemplazar `accountNumber` a ciegas por un **token por `client-account`** (patrón slug) | C |
| 3 | **Colección `signals`** nueva sobre el modelo nuevo (`indicatorId` + `channelId`, no `projectId`; los 5 tiempos; `dedupKey`; `externalId`) | B |
| 4 | **Receiver del webhook**: ya existe (nivel indicador). Extenderlo para parsear + normalizar + dedup + persistir, en vez de solo sellar `lastSignalAt` | B |
| 5 | **`client-accounts`** (ex `user_account_info` + `user_platform`) | C |
| 6 | **`channel-subscriptions`** (ex `symbol_executions`) — `params.*` como objeto validado por el manifest, no columnas fijas | D |
| 7 | **Manifest**: parsear al subir `ProductVersion`; `params[]` + `signalFields[]` + política | D |
| 8 | **EA gateway** — `GET /ea/signal` + `POST /ea/result`, el envelope (formato dual), check de versión vs `ProductVersion` | E |
| 9 | **Aliases de símbolo**: `symbols` ya tiene `aliases[]`; cablear la normalización (hoy nadie la consume) + overrides por cuenta | B/D |
| 10 | **Máquina de estados de entrega**: registros `delivery` por-target + cursor por-EA | D/E |
| 11 | **Lógica de fan-out**: signal → orders → subscriptions. La pieza "marketplace" que el código viejo nunca tuvo | D |
| 12 | **Chequeos de entitlement**: order activa, trial/periodo válido, al momento de entregar | D |
| 13 | **Resultado → atribución**: ligar `delivery → order → P&L` para la analítica del proveedor | E |
| 14 | **Migración de datos**: `indicator_projects`, `admin_indicators`, `alerts`, `symbol_executions`, `user_account_info` — casi vacías en dev → drop + rebuild. Documentar el mapeo si hay datos reales | B–D |
| 15 | **Matar los remanentes `code_project_*` / `project_code_platform`** que `signals.service` todavía importa → reemplazados por `Product`/`ProductVersion` | B |

---

## 6. Los dos estándares

### 6.1 Estándar base (todos los `type`)

- **`account.*`** — cuenta de trading del cliente: `canTrade`, `platform`, límites drawdown/profit,
  estado de conexión, kill-switch, moneda/apalancamiento.
- **`params.*`** — config por-suscripción del cliente, schema declarado en `jtrade.manifest.json`
  (`ParamDef[]`: `key/label/type/required/default/editable/min/max/options/group`).
- **`meta.*`** — `productKey`, `productVersion`, `expiresAt`, `deliveryId`.
- **Envelope dual**: JSON o string plano `key=value;` (retrocompat con los EAs actuales).
- Detalle completo en `ea-communication-standard.md`.

### 6.2 Estándar de flujo de señales (`type = signal`)

Suma sobre el base:

- **`signal.*`** — campos canónicos de la señal: `id, action, direction, symbol, timeframe,
  barTime, firedAt, expiresAt, price?, strategyContext?`.
- **`signal.custom.*`** — campos que la fuente manda, declarados como `signalFields[]` en el manifest.
- **Identidad**: `webhookSlug` (por indicador) + `channelId` (por símbolo+timeframe, estable) +
  `buyKey`/`sellKey` (o `key` + `action`).
- **Dedup** en capas: `externalId` → `barTime` → cooldown por TF · + cursor por-EA.
- **Expiración**: TTL por TF (`expiresAt = barTime + TTL`) + supersesión.
- **Símbolos**: catálogo canónico + `aliases[]` + override por cuenta, normalización bidireccional.
- **Suscripción**: por `(order, channel, account)`, con `params.*` del manifest.
- **Entrega**: instancia por-target con máquina de estados + callback de resultado.
- Detalle completo en `signal-product-standard.md`.

### 6.3 Regla de oro

> **Ingesta = a nivel indicador** (plomería de señal, sin dinero).
> **Entitlement = a nivel `order`** (checado al entregar, la frontera de monetización).
> **Ejecución = a nivel `Product`/`Platform`** (qué EA, qué plataforma).
