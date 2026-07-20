export type NotifyEventParams = PlatformEventParams | BusinessEventParams;
interface BaseEventParams {
    event: string;
    email: string;
    data: Record<string, string | undefined | null>;
}
export interface PlatformEventParams extends BaseEventParams {
    type: 'platform';
}
export interface BusinessEventParams extends BaseEventParams {
    type: 'business';
    businessId: string;
}
export {};
