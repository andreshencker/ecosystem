/**
 * Eventos de notificación relacionados con Signals.
 *
 * Estos eventos normalmente son emitidos por:
 * - 3001 (Signals / Orchestrator) cuando valida el webhook
 *   y detecta intentos inválidos.
 *
 * Pero también pueden ser usados desde 3002 si en algún punto
 * decides notificar desde aquí (ej: validaciones internas).
 *
 * Prefijo estándar: signal.*
 */
export enum SignalNotificationEvent {
  /**
   * userPlatformId no existe o es inválido.
   */
  INVALID_USER_PLATFORM = 'signal.invalid_user_platform',

  /**
   * userPlatformId existe, pero webhookKey no coincide (intento inválido).
   */
  WEBHOOK_KEY_INVALID = 'signal.webhook_key_invalid',
}
