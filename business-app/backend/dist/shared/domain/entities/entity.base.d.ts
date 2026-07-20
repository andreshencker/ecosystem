export declare abstract class Entity<TId> {
    protected readonly _id: TId;
    protected constructor(_id: TId);
    get id(): TId;
    equals(other: Entity<TId>): boolean;
}
