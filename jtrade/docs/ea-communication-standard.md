# jtrade — Estándar de comunicación producto ↔ runtime

Estado: **propuesta** · Rama: `codex/grapifly-ecosystem` · Reemplaza al `orchestrator/`

---

## 1. El problema

El `orchestrator` entrega un string hardcodeado para **un solo producto** (el EA que hizo la
plataforma):

```
userPlatformId=…;signalId=…;canTrade=true;action=BUY;timeFrame=M15;riskPercent=1;
rrRatio=2;stopDistancePips=20;atrMultiplier=1.5;atrPeriod=14;useTrailingStop=false;
useStopLoss=true;useTakeProfit=true;useBreakEven=true;useDrawdownLimit=false;
maxDrawdownPercent=0;useProfitLimit=false;maxProfitPercent=0;createdAt=1730000000000;
```

En un marketplace con desarrolladores externos, cada producto necesita variables distintas
y jtrade **no las conoce de antemano**. Hay que estandarizar la comunicación.

**En una frase:** jtrade sabe *qué señal* llegó y *qué cuenta* la recibe, pero **no sabe qué
parámetros** necesita el código del dev para operar. Eso lo declara el producto.

---

## 2. Las 3 capas de datos que llegan al runtime

Toda la info que recibe el EA/bot se parte en 3, según **quién la provee**:

| Capa | Quién la pone | Ejemplos | ¿La define el dev? |
|---|---|---|---|
| **`signal.*`** | la alerta del indicador | `action`, `symbol`, `timeframe`, `signalId`, `createdAt` | ❌ fija, jtrade la garantiza siempre |
| **`account.*`** | la cuenta de trading del cliente | `canTrade`, `platform`, `useDrawdownLimit`, `maxDrawdownPercent`, `useProfitLimit`, `maxProfitPercent` | ❌ fija |
| **`params.*`** | **el cliente**, según un esquema **que declara el dev** | `riskPercent`, `rrRatio`, `stopDistancePips`, `atrPeriod`, `atrMultiplier`, `useTrailingStop`, `useStopLoss`, `useTakeProfit`, `useBreakEven` | ✅ **esto es lo nuevo** |

El estándar = **`signal.*` fijo + `account.*` fijo + `params.*` definido por producto**.

### Catálogo de campos fijos (v1 — a congelar)

**`signal.*`**

| key | tipo | descripción |
|---|---|---|
| `signal.id` | string | id único de la señal (idempotencia) |
| `signal.action` | `BUY` \| `SELL` | dirección |
| `signal.symbol` | string | símbolo canónico de jtrade |
| `signal.timeframe` | string | `M1 M5 M15 M30 H1 H4 D1 W1` |
| `signal.createdAt` | number | epoch ms de emisión |

**`account.*`**

| key | tipo | descripción |
|---|---|---|
| `account.canTrade` | boolean | el cliente habilitó operar en esta cuenta |
| `account.platform` | string | plataforma de la cuenta (MT5, …) |
| `account.useDrawdownLimit` | boolean | |
| `account.maxDrawdownPercent` | number | 0 = sin límite |
| `account.useProfitLimit` | boolean | |
| `account.maxProfitPercent` | number | 0 = sin límite |

---

## 3. El estándar para desarrolladores: el manifiesto

Para que un producto sea compatible, el dev incluye un `jtrade.manifest.json` **dentro del
bundle de la versión**. jtrade lo parsea al subir la versión.

```json
{
  "schemaVersion": "1",
  "runtime": "mt5-ea",
  "params": [
    {
      "key": "riskPercent",
      "label": "Riesgo por operación (%)",
      "type": "number",
      "required": true,
      "default": 1,
      "min": 0.1,
      "max": 10,
      "step": 0.1,
      "editable": true,
      "group": "Gestión de riesgo",
      "help": "% del balance arriesgado por posición"
    },
    {
      "key": "useTrailingStop",
      "label": "Trailing stop",
      "type": "boolean",
      "default": false
    },
    {
      "key": "lotMode",
      "label": "Modo de lote",
      "type": "enum",
      "options": ["fijo", "por-riesgo", "atr"],
      "default": "por-riesgo"
    }
  ],
  "consumes": ["signal.action", "signal.symbol", "account.canTrade"]
}
```

### Definición de un parámetro (`ParamDef`)

| campo | obligatorio | descripción |
|---|---|---|
| `key` | sí | identificador. Sale como `params.<key>`. No puede colisionar con keys reservadas |
| `label` | sí | texto visible en el formulario |
| `type` | sí | `number` \| `boolean` \| `string` \| `enum` |
| `required` | no | default `false` |
| `default` | no | valor por defecto |
| `editable` | no | default `true`. Si `false`: se usa `default`, no se muestra input |
| `min` / `max` / `step` | no | solo `number` |
| `options` | sí si `enum` | lista de valores permitidos |
| `group` | no | agrupa inputs en secciones del formulario |
| `help` | no | texto de ayuda |

### Reglas del estándar

- **Tipos soportados:** `number` (con min/max/step), `boolean`, `string`, `enum`.
- **`editable: false`** = constante del dev; se usa el `default` y no se pide al cliente.
- **Keys reservadas:** el dev no puede nombrar un param `action`, `symbol`, `timeframe`,
  `signalId`, `createdAt`, `canTrade`, `platform`, ni ningún `signal.*` / `account.*`.
  jtrade valida contra la lista fija y rechaza la subida.
- **El manifiesto viaja con cada `productVersion`.** Subir un EA nuevo puede añadir params;
  a las suscripciones existentes se les pide llenar los nuevos.
- **Bootstrap:** si no hay manifiesto, el provider escribe los params a mano en el form del
  producto (mismo esquema `ParamDef[]`).

---

## 4. El formulario dinámico (lado cliente)

Cuando el cliente tiene una `order` activa y quiere operar en una de sus cuentas:

1. Abre "Configurar" → jtrade renderiza inputs desde `productVersion.params`, agrupados por `group`.
2. El cliente llena valores → jtrade valida contra el esquema (required, min/max, enum, tipo).
3. Se guarda el registro de config (ex `symbol_executions`):

```jsonc
{
  "orderId":          "…",
  "clientAccountId":  "…",
  "productVersionId": "…",
  "values": { "riskPercent": 1.5, "useTrailingStop": true, "lotMode": "atr" }
}
```

---

## 5. La ruta única de canalización

Un solo endpoint. El EA/bot hace polling con su `token`.

```
GET /backend/ea/signal?token=<cuenta>&symbol=<broker>&timeframe=M15
      &lastSignalId=<uuid>&eaVersion=1.4.2&productVersionId=<id>
```

### Variables que pasa el EA (request)

| variable | tipo | qué es | cambio vs orquestador |
|---|---|---|---|
| `token` | string | credencial de la cuenta de trading (patrón slug) | **nuevo** — reemplaza `accountNumber` a pelo |
| `symbol` | string | símbolo del broker tal cual (`EURUSD.m`) | igual — se normaliza con `aliases[]` |
| `timeframe` | string | `M15`, `H1`, … | igual (`timeFrame` → `timeframe`) |
| `lastSignalId` | string | el `signalId` que el EA ya procesó | igual (`latestSignalId` → `lastSignalId`) |
| `eaVersion` | string | versión del EA (`1.4.2`) | igual |
| `productVersionId` | string | versión del producto a la que pertenece el EA | reemplaza `eaVersionId` (era `code_project_platform`) |

### Envelope (response)

Dos formatos, mismo endpoint, por header `Accept`:

**`application/json`** — bots nuevos:

```jsonc
{
  "signal":  { "id": "…", "action": "BUY", "symbol": "EURUSD", "timeframe": "M15", "createdAt": 1730000000000 },
  "account": { "canTrade": true, "platform": "MT5", "useDrawdownLimit": false, "maxDrawdownPercent": 0,
               "useProfitLimit": false, "maxProfitPercent": 0 },
  "params":  { "riskPercent": 1.5, "useTrailingStop": true, "lotMode": "atr" },
  "meta":    { "productKey": "fvg-engine", "productVersion": "1.4.2", "expiresAt": 1730000120000 }
}
```

**`text/plain`** (default) — retrocompatible con los EAs actuales que hacen
`split(";")` → `split("=")`:

```
signal.id=…;signal.action=BUY;signal.symbol=EURUSD;signal.timeframe=M15;signal.createdAt=…;
account.canTrade=true;account.platform=MT5;account.maxDrawdownPercent=0;account.maxProfitPercent=0;
params.riskPercent=1.5;params.useTrailingStop=true;params.lotMode=atr;
meta.productVersion=1.4.2;meta.expiresAt=…
```

El plano es solo `flatten(envelope)` unido con `;`. Los EAs actuales siguen funcionando y
reciben automáticamente los `params.*` que el dev declaró.

### Strings centinela (nada que operar)

`EA version invalid` · `No account configuration` · `No signal` · `Signal already delivered`
· `No active subscription` · `Signal expired`

### Tiempos (server-side, no vienen del EA)

- **Expiración de señal por TF:** M1 30s · M5 60s · M15 120s · M30 180s · H1 300s · H4 600s · D1 1800s (default 120s)
- **Cooldown por vela** (dedupe de entrantes): M1 60s · M5 5m · M15 15m · M30 30m · H1 1h · H4 4h · D1 24h

---

## 6. Dónde vive en el modelo de datos

| Pieza | Dónde |
|---|---|
| esquema de params | `ProductVersion.manifest` (parseado del bundle) — fallback `Product.runtimeParams` (manual) |
| valores del cliente | nuevo registro de config `{ order, clientAccount, productVersion, values }` (ex `symbol_executions`) |
| ruta + envelope + string plano | módulo nuevo `core/ea-gateway/` |
| catálogo de keys fijas + doc del manifiesto + EA de referencia | publicado por jtrade para devs |

---

## 7. Orden de trabajo

1. **Ahora:** borrar el `orchestrator/` completo (Binance + proxy MT5 + infra). Nada en el repo lo referencia.
2. **Congelar:** catálogo `signal.*` + `account.*` (sección 2) y el JSON schema del manifiesto (sección 3). Documento, no código.
3. **Fase B** — `signals`: receiver del webhook `/webhooks/tv/:slug` → resolver `key` → normalizar símbolo (aliases) → cooldown → persistir `signal`. Historial por indicador.
4. **Fase C** — `client-accounts` (ex `user-account-info`): cuentas MT4/MT5 del cliente + `token` + `canTrade` + límites drawdown/profit.
5. **Fase D** — config + formulario dinámico: parseo del manifiesto en la subida de versión, `ParamDef[]` en el producto, formulario dinámico del cliente, registro de config.
6. **Fase E** — `ea-gateway`: ruta `GET /backend/ea/signal`, ensamblado del envelope, salida dual (JSON + string plano), `POST /backend/ea/result` opcional para trazabilidad de fills.

Fases B→C→D→E son secuenciales.
