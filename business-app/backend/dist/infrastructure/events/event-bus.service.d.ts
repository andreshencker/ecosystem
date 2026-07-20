export declare const PLATFORM_EVENTS: {
    readonly USER_INVITATION_PASSWORD_COMPLETED: "user.invitation-password-completed";
};
export type PlatformEventKey = (typeof PLATFORM_EVENTS)[keyof typeof PLATFORM_EVENTS];
export interface InvitationPasswordCompletedPayload {
    email: string;
}
export declare class EventBusService {
    private readonly emitter;
    emit(event: PlatformEventKey, payload: unknown): void;
    on(event: PlatformEventKey, listener: (payload: any) => void): void;
    off(event: PlatformEventKey, listener: (payload: any) => void): void;
}
