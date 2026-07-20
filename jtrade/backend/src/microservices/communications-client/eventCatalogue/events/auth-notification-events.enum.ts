export enum AuthNotificationEvent {
  PASSWORD_RESET_REQUESTED = 'auth.password_reset_requested',
  PASSWORD_CHANGED = 'auth.password_changed',
  ACCOUNT_LOCKED = 'auth.account_locked',
  ADMIN_CREATED = 'auth.admin_created',
  ADMIN_PASSWORD_RESET_REQUESTED = 'auth.admin.password.reset.requested',

  // ✅ Nuevo evento para verificación
  EMAIL_VERIFICATION_REQUESTED = 'auth.email_verification_requested',
}
