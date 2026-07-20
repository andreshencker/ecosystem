export interface SoftDeletable {
    deletedAt: Date | null;
    deletedBy: string | null;
}
export declare function isDeleted(entity: SoftDeletable): boolean;
