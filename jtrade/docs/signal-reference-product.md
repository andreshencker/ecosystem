# jtrade — El EA legacy como primer producto del estándar `signal`

Estado: **definición** · Companion de `signal-product-standard.md` y `signal-migration-map.md`

Objetivo: tomar el string hardcodeado de 19 campos que produce hoy
`getMt5SignalInformation` y convertirlo en **un producto `type=signal` que cumple el estándar**,
sin cambiar la lógica de trading del EA.

---

## 1. Modelo de 3 capas

| Capa | Quién la define | Quién la llena | Qué es |
|---|---|---|---|
| **Protocolo (mínimo)** | jtrade | jtrade | Los campos que **todo** producto `type=signal` recibe siempre. El código del dev puede asumir que existen. |
| **Manifest del desarrollador** | el dev, en `jtrade.manifest.json` | — | Declara `params[]` (lo que necesita su código, **incluyendo lo de la plataforma**) y `signalFields[]` (lo que la fuente manda por señal). |
| **Configuración del cliente** | — | el cliente | Los valores de los `params[]` con `editable ≠ false`, por cada canal que sigue. Y `account.*` una vez por cuenta. |

Regla:
- El **protocolo** garantiza compatibilidad: cualquier código que lea `signal.*` + `account.*` + `meta.*` funciona en jtrade.
- El **dev** agrega todo lo demás que su código necesita (estrategia + plataforma) vía manifest.
- El **cliente** llena lo que el dev pidió para obtener los resultados de su operativa.

---

## 2. La capa Protocolo — campos garantizados

### `signal.*` (siempre presente en `type=signal`)

| Campo | Tipo | Notas |
|---|---|---|
| `signal.id` | string | único (idempotencia en el EA) |
| `signal.action` | `BUY \| SELL \| CLOSE \| CLOSE_LONG \| CLOSE_SHORT \| REVERSE` | |
| `signal.direction` | `long \| short \| flat` | derivado de `action` |
| `signal.symbol` | string | símbolo **canónico** de jtrade |
| `signal.timeframe` | string | `M1 M5 M15 M30 H1 H4 D1 W1` |
| `signal.barTime` | number (epoch ms) | apertura de la vela |
| `signal.firedAt` | number (epoch ms) | cuándo disparó la fuente |
| `signal.expiresAt` | number (epoch ms) | el EA no debe operar después de esto |
| `signal.price` | number \| null | precio de referencia al disparar (null si la fuente no lo manda) |

### `account.*` (siempre, todo `type`)

| Campo | Tipo | Notas |
|---|---|---|
| `account.platform` | `MT4 \| MT5 \| cTrader \| …` | |
| `account.canTrade` | bool | el cliente habilitó operar |
| `account.currency` | string | moneda de la cuenta (cálculo de lote) |
| `account.leverage` | number | apalancamiento |
| `account.useDrawdownLimit` | bool | |
| `account.maxDrawdownPercent` | number | 0 = sin límite |
| `account.useProfitLimit` | bool | |
| `account.maxProfitPercent` | number | 0 = sin límite |
| `account.connected` | bool | el puente/EA está conectado |

### `meta.*` — identificación y trazabilidad (bajada)

| Campo | Tipo | Para qué |
|---|---|---|
| `meta.productId` | string | id del producto |
| `meta.productKey` | string | key legible |
| `meta.productVersionId` | string | id de la versión contra la que jtrade validó el EA |
| `meta.productVersion` | string | **la versión del código** (`1.4.2`) — lo que el EA debe estar corriendo |
| `meta.channelId` | string | canal `(indicador, símbolo, timeframe)` |
| `meta.signalId` | string | la señal ingerida |
| `meta.deliveryId` | string | esta entrega `(signal × subscription)` — se manda en `POST /ea/result` |
| `meta.orderId` | string | la compra del cliente → trazabilidad a P&L |
| `meta.subscriptionId` | string | la config por-canal |
| `meta.accountId` | string | la cuenta del cliente en jtrade |
| `meta.serverTime` | number (epoch ms) | reloj del servidor (skew) |
| `meta.format` | `json \| flat` | |

### Request del EA → jtrade — identificación (subida)

| Campo | Tipo | Notas |
|---|---|---|
| `token` | string | credencial de la `client-account` |
| `productKey` | string | qué producto (el EA se instala por producto; una cuenta puede tener varios EAs) |
| `eaVersion` | string | la versión compilada en el EA (`1.4.2`) |
| `symbol` | string | símbolo del broker |
| `timeframe` | string | |
| `lastSignalId` | string | último `signalId` procesado (idempotencia) |

jtrade valida: `token` → account → tiene `order` activa en `productKey` → `eaVersion` permitida
vs la `ProductVersion` actual. Devuelve `meta.productVersion` con la esperada; si difiere, el EA
avisa "actualiza".

---

## 3. Mapeo del string legacy (19 campos) → las 3 capas

| Campo legacy | Capa nueva | Namespace nuevo |
|---|---|---|
| `userPlatformId` | Protocolo | `account.platform` |
| `signalId` | Protocolo | `signal.id` |
| `canTrade` | Protocolo | `account.canTrade` |
| `action` | Protocolo | `signal.action` |
| `timeFrame` | Protocolo | `signal.timeframe` |
| `createdAt` | Protocolo | `signal.barTime` *(+ se agrega `signal.expiresAt`)* |
| `useDrawdownLimit` | Protocolo | `account.useDrawdownLimit` |
| `maxDrawdownPercent` | Protocolo | `account.maxDrawdownPercent` |
| `useProfitLimit` | Protocolo | `account.useProfitLimit` |
| `maxProfitPercent` | Protocolo | `account.maxProfitPercent` |
| `riskPercent` | Dev + cliente | `params.riskPercent` |
| `rrRatio` | Dev + cliente | `params.rrRatio` |
| `stopDistancePips` | Dev + cliente | `params.stopDistancePips` |
| `atrMultiplier` | Dev + cliente | `params.atrMultiplier` |
| `atrPeriod` | Dev + cliente | `params.atrPeriod` |
| `useTrailingStop` | Dev + cliente | `params.useTrailingStop` |
| `useStopLoss` | Dev + cliente | `params.useStopLoss` |
| `useTakeProfit` | Dev + cliente | `params.useTakeProfit` |
| `useBreakEven` | Dev + cliente | `params.useBreakEven` |
| *(calculado, no salía)* `contractSize` | Dev + cliente | `params.contractSize` |
| *(calculado, no salía)* `closeTradesOnWeekend` | Dev + cliente | `params.closeTradesOnWeekend` |

**Nuevos (no existían en el legacy):**
`signal.direction`, `signal.firedAt`, `signal.expiresAt`, `signal.price`,
`account.currency`, `account.leverage`, `account.connected`, todo `meta.*`, `signal_custom.*`.

**Lo de la plataforma que el legacy no tenía y el dev debería declarar:**
`magicNumber`, `maxSpreadPoints`, `slippagePoints`, `orderComment`, `gmtOffset`, `retries`.

---

## 4. Manifest de referencia — el EA legacy

`jtrade.manifest.json` dentro del bundle de la `ProductVersion`:

```json
{
  "schemaVersion": "1",
  "runtime": "mt5-ea",
  "product": { "type": "signal" },

  "params": [
    { "key": "riskPercent", "label": "Riesgo por operación (%)", "type": "number",
      "required": true, "default": 1, "min": 0.1, "max": 10, "group": "Riesgo" },
    { "key": "rrRatio", "label": "Ratio riesgo/beneficio", "type": "number",
      "required": true, "default": 2, "min": 0.5, "max": 10, "group": "Riesgo" },
    { "key": "useStopLoss", "label": "Usar Stop Loss", "type": "boolean", "default": true, "group": "Riesgo" },
    { "key": "stopDistancePips", "label": "Distancia SL (pips)", "type": "number", "default": 20, "min": 0, "group": "Riesgo" },
    { "key": "useTakeProfit", "label": "Usar Take Profit", "type": "boolean", "default": true, "group": "Riesgo" },
    { "key": "useBreakEven", "label": "Break-even", "type": "boolean", "default": true, "group": "Riesgo" },
    { "key": "useTrailingStop", "label": "Trailing stop", "type": "boolean", "default": false, "group": "Riesgo" },

    { "key": "atrPeriod", "label": "ATR período", "type": "number", "default": 14, "min": 1, "group": "ATR" },
    { "key": "atrMultiplier", "label": "ATR multiplicador", "type": "number", "default": 1.5, "min": 0, "group": "ATR" },

    { "key": "contractSize", "label": "Lote fijo (0 = por riesgo)", "type": "number", "default": 0, "min": 0, "group": "Lote" },
    { "key": "closeTradesOnWeekend", "label": "Cerrar el fin de semana", "type": "boolean", "default": false, "group": "Sesión" },

    { "key": "magicNumber", "label": "Magic number", "type": "number", "default": 990001, "group": "Plataforma" },
    { "key": "maxSpreadPoints", "label": "Spread máximo (points)", "type": "number", "default": 30, "min": 0, "group": "Plataforma" },
    { "key": "slippagePoints", "label": "Slippage (points)", "type": "number", "default": 20, "min": 0, "group": "Plataforma" },
    { "key": "orderComment", "label": "Comentario de la orden", "type": "string", "default": "jtrade", "editable": false, "group": "Plataforma" }
  ],

  "signalFields": [
    { "key": "slPrice", "type": "number", "required": false },
    { "key": "tpPrice", "type": "number", "required": false }
  ],

  "policy": {
    "actions": ["BUY", "SELL"],
    "dedup": "cooldown",
    "expiration": { "M1": 30, "M5": 60, "M15": 120, "M30": 180, "H1": 300, "H4": 600, "D1": 1800 }
  }
}
```

- `params[]` con `editable: true` (default) → los llena el **cliente** en el form dinámico.
- `orderComment` con `editable: false` → constante del dev, no se pide al cliente.
- `signalFields[]` → la fuente puede mandar `slPrice`/`tpPrice` en el payload del webhook; llegan como `signal_custom.slPrice`.

---

## 5. Envelope de referencia

### JSON (`Accept: application/json`)

```json
{
  "signal": {
    "id": "9b1c…", "action": "BUY", "direction": "long",
    "symbol": "EURUSD", "timeframe": "M15",
    "barTime": 1730000000000, "firedAt": 1730000001200, "expiresAt": 1730000120000,
    "price": 1.0850
  },
  "account": {
    "platform": "MT5", "canTrade": true, "currency": "USD", "leverage": 100,
    "useDrawdownLimit": false, "maxDrawdownPercent": 0,
    "useProfitLimit": false, "maxProfitPercent": 0, "connected": true
  },
  "params": {
    "riskPercent": 1.5, "rrRatio": 2, "useStopLoss": true, "stopDistancePips": 20,
    "useTakeProfit": true, "useBreakEven": true, "useTrailingStop": false,
    "atrPeriod": 14, "atrMultiplier": 1.5, "contractSize": 0, "closeTradesOnWeekend": false,
    "magicNumber": 990001, "maxSpreadPoints": 30, "slippagePoints": 20, "orderComment": "jtrade"
  },
  "signal_custom": { "slPrice": 1.0820 },
  "meta": {
    "productId": "p_1a…", "productKey": "legacy-mt5-scalper",
    "productVersionId": "pv_9c…", "productVersion": "1.0.0",
    "channelId": "ch_4d…", "signalId": "9b1c…", "deliveryId": "d_7f…",
    "orderId": "o_2e…", "subscriptionId": "s_8b…", "accountId": "a_5f…",
    "serverTime": 1730000005000, "format": "json"
  }
}
```

### String plano (default — retrocompat con el EA actual)

```
signal.id=9b1c…;signal.action=BUY;signal.direction=long;signal.symbol=EURUSD;signal.timeframe=M15;
signal.barTime=1730000000000;signal.firedAt=1730000001200;signal.expiresAt=1730000120000;signal.price=1.0850;
account.platform=MT5;account.canTrade=true;account.currency=USD;account.leverage=100;
account.useDrawdownLimit=false;account.maxDrawdownPercent=0;account.useProfitLimit=false;account.maxProfitPercent=0;account.connected=true;
params.riskPercent=1.5;params.rrRatio=2;params.useStopLoss=true;params.stopDistancePips=20;params.useTakeProfit=true;params.useBreakEven=true;params.useTrailingStop=false;
params.atrPeriod=14;params.atrMultiplier=1.5;params.contractSize=0;params.closeTradesOnWeekend=false;
params.magicNumber=990001;params.maxSpreadPoints=30;params.slippagePoints=20;params.orderComment=jtrade;
signal_custom.slPrice=1.0820;
meta.productId=p_1a…;meta.productKey=legacy-mt5-scalper;meta.productVersionId=pv_9c…;meta.productVersion=1.0.0;
meta.channelId=ch_4d…;meta.signalId=9b1c…;meta.deliveryId=d_7f…;meta.orderId=o_2e…;meta.subscriptionId=s_8b…;meta.accountId=a_5f…;meta.serverTime=1730000005000
```

El string sigue siendo `split(";")` → `split("=")`. La única diferencia: las claves ahora tienen
namespace (`signal.`, `account.`, `params.`, `meta.`).

---

## 6. Qué cambia en el CÓDIGO del EA legacy (mínimo)

| Antes | Ahora |
|---|---|
| lee `riskPercent` | lee `params.riskPercent` |
| lee `userPlatformId` | lee `account.platform` |
| lee `createdAt`, calcula edad | lee `signal.barTime` **y respeta `signal.expiresAt`** |
| `accountNumber` como identidad | manda un **`token`** de cuenta en el polling |
| `eaVersionId` = `projectCodePlatformId` | manda `productKey` + `eaVersion`; recibe `meta.productVersion` esperada |
| — | opcionalmente lee `signal_custom.slPrice` / `signal_custom.tpPrice` |
| — | opcionalmente `POST /ea/result` con el fill |

La lógica de trading (cálculo de lote, SL/TP, trailing, ATR…) **no cambia**.

---

## 7. Qué cambia en jtrade para servir este producto

1. `Product` `type=signal`, `platformId = MT5`, `indicatorIds = [<el indicador legacy>]`.
2. `ProductVersion` con el `.ex5` + el `jtrade.manifest.json` de arriba.
3. jtrade parsea el manifest al subir → guarda `params[]` + `signalFields[]` + `policy`.
4. El cliente compra → conecta cuenta (`account.*` + token) → por canal llena `params.*` → instala el EA.
5. El `ea-gateway` ensambla el envelope de la sección 5 (formato dual) — reemplaza el string
   hardcodeado de `getMt5SignalInformation`.

---

## Resumen

- **Protocolo** = `signal.*` + `account.*` + `meta.*`. jtrade lo garantiza. El dev lo asume.
- **Manifest** = `params[]` (estrategia **+ plataforma**) + `signalFields[]` + `policy`. Lo pone el dev.
- **Cliente** = llena los `params[]` editables por canal + `account.*` por cuenta.
- El EA legacy pasa a ser el **producto de referencia** cambiando solo los nombres de campo que lee
  y agregando `token` + `expiresAt`.
