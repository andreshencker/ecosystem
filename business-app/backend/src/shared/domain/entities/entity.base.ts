export abstract class Entity<TId> {
  protected constructor(protected readonly _id: TId) {}

  get id(): TId {
    return this._id;
  }

  equals(other: Entity<TId>): boolean {
    if (!(other instanceof Entity)) return false;
    const a: unknown = this._id;
    const b: unknown = other._id;
    if (a === b) return true;
    // Support Value Object ids that implement equals()
    if (
      a !== null &&
      a !== undefined &&
      typeof (a as { equals?: unknown }).equals === 'function'
    ) {
      return (a as { equals: (x: unknown) => boolean }).equals(b);
    }
    return false;
  }
}
