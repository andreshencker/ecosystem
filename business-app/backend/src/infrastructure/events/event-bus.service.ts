import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

/** Typed modules event keys. */
export const PLATFORM_EVENTS = {
  /** Emitted by UsersController after a forced first-login password change completes. */
  USER_INVITATION_PASSWORD_COMPLETED: 'user.invitation-password-completed',
} as const;

export type PlatformEventKey =
  (typeof PLATFORM_EVENTS)[keyof typeof PLATFORM_EVENTS];

export interface InvitationPasswordCompletedPayload {
  email: string;
}

@Injectable()
export class EventBusService {
  private readonly emitter = new EventEmitter();

  emit(event: PlatformEventKey, payload: unknown): void {
    // Max-listeners raised to avoid Node.js warning in tests with many subscribers.
    this.emitter.setMaxListeners(20);
    this.emitter.emit(event, payload);
  }

  on(event: PlatformEventKey, listener: (payload: any) => void): void {
    this.emitter.on(event, listener);
  }

  off(event: PlatformEventKey, listener: (payload: any) => void): void {
    this.emitter.off(event, listener);
  }
}
