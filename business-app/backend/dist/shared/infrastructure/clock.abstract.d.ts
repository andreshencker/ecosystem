export declare abstract class Clock {
    abstract now(): Date;
    abstract nowIso(): string;
}
export declare class SystemClock extends Clock {
    now(): Date;
    nowIso(): string;
}
