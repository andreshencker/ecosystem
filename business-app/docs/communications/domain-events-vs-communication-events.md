> ⚠️ **DEPRECATED** — Este documento fue migrado a:
> **`docs/integrations/communications/notifications.md`** (§1 Cuándo crear un Communication Event + §9 Domain Events vs Communication Events)
> No actualizar este documento. Usar la nueva fuente de verdad.

# Domain Events vs Communication Events

**Versión:** 1.0  
**Fecha:** 2026-07-06  
**Estado:** Canónico

---

## 1. Definición

### Domain Event (Evento de Dominio)

Un Domain Event es un hecho que ocurrió dentro de un agregado de dominio. Es **interno** al sistema y su propósito es notificar a otros módulos o mantener consistencia eventual entre agregados.

**Características:**
- Persiste en el Outbox para garantía de entrega
- No sale del sistema hacia canales externos (email, SMS, push)
- Puede tener handlers en otros módulos del mismo bounded context
- Ejemplo: `CustomerCreatedEvent`, `BusinessCreatedEvent`

### Communication Event (Evento de Comunicación)

Un Communication Event es un evento que **sale del sistema** hacia un destinatario externo (usuario o cliente) a través de un canal (email, SMS, push notification).

**Características:**
- Se entrega mediante `CommunicationClientService.notifyEvent()`
- Lo ejecuta Communications Platform
- Tiene un template asociado, canales configurados, logs de entrega
- Ejemplo: `security.company_verify_email`, `invoices.invoice_sent`

---

## 2. La regla de decisión

```
¿Este evento necesita salir por un canal externo (email/SMS/push)?

  NO → usar toast/snackbar/alert en el frontend
       publicar DomainEvent al Outbox (si otros módulos necesitan saberlo)
       NO crear Communication Event

  SÍ → crear domain + event en Communications si no existen
       definir template por defecto
       definir typeBusiness: 'platform' o 'company'
       llamar CommunicationClientService.notifyEvent()
```

---

## 3. Los Domain Events NO son Communication Events automáticamente

Un Domain Event puede existir sin ningún Communication Event asociado. La propagación de un Domain Event al Outbox **no implica** que se vaya a enviar ningún email.

### Ejemplo correcto — Customer

| Acción | Domain Event | Communication Event |
|--------|-------------|---------------------|
| Cliente creado | `customer.created` → Outbox ✅ | ❌ No requerido (toast frontend) |
| Cliente actualizado | `customer.updated` → Outbox ✅ | ❌ No requerido (toast frontend) |
| Cliente desactivado | `customer.deactivated` → Outbox ✅ | ❌ No requerido (toast frontend) |

El Outbox permite que otros bounded contexts (ej. Billing) reaccionen a la creación de un cliente. Eso es suficiente. No se necesita enviar un email al cliente porque lo crearon.

### Ejemplo correcto — Auth / Seguridad

| Acción | Domain Event | Communication Event |
|--------|-------------|---------------------|
| Usuario registrado | _(ninguno — operación transaccional simple)_ | `security.company_verify_email` ✅ |
| Contraseña olvidada | _(ninguno)_ | `security.company_forgot_password` ✅ |
| Contraseña restablecida | _(ninguno)_ | `security.company_password_changed` ✅ |
| Usuario invitado | _(ninguno)_ | `security.company_user_invitation` ✅ |

---

## 4. Cuándo crear un Communication Event nuevo

Un nuevo módulo o feature DEBE crear un Communication Event solo si:

1. La acción produce un email, SMS o push dirigido a una persona externa al sistema.
2. El destinatario necesita actuar (click en un link, responder, guardar información).

Ejemplos futuros que sí justifican un Communication Event:
- `invoices.invoice_sent` — el cliente recibe la factura
- `invoices.invoice_overdue` — el cliente recibe recordatorio de deuda
- `payments.payment_received` — el cliente recibe confirmación de pago
- `documents.document_sent` — el cliente recibe un documento

Ejemplos que NO justifican un Communication Event:
- El administrador creó un cliente → toast en pantalla
- El usuario actualizó su perfil → toast en pantalla
- El sistema procesó un cálculo → log interno
- El usuario cambió la moneda por defecto → toast en pantalla

---

## 5. Flujo de creación de un Communication Event nuevo

```
1. Confirmar que hay necesidad real de canal externo
2. Determinar typeBusiness:
     platform → evento del sistema (auth, invitaciones, lifecycle de plataforma)
     company  → evento del negocio del tenant (facturas, reportes, documentos)
3. Crear domain en Communications si no existe
4. Crear event en Communications
5. Crear template por defecto en Communications (DEFAULT_PLATFORM_EVENTS o similar)
6. Llamar CommunicationClientService.notifyEvent() desde el servicio correspondiente
7. Nunca llamar desde el frontend
```

---

## 6. Frontend y notificaciones

El frontend NUNCA llama a Communications directamente.

Para notificar al usuario sobre el resultado de una acción en pantalla:
- Usar `toast` / `snackbar` (ya implementado vía `GlobalSnackbar`)
- Usar `alert` o mensaje inline para errores validados

El frontend puede llamar a Business App backend para acciones que disparen un Communication Event, pero nunca a Communications Platform directamente.
