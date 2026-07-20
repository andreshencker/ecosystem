export interface SoftDeletable {
  deletedAt: Date | null;
  deletedBy: string | null;
}

export function isDeleted(entity: SoftDeletable): boolean {
  return entity.deletedAt !== null;
}
