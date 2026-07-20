export declare abstract class ValueObject<T extends object> {
    protected readonly props: Readonly<T>;
    protected constructor(props: T);
    equals(other: ValueObject<T>): boolean;
}
