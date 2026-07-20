export declare abstract class BaseRepository<TEntity, TId> {
    abstract findById(id: TId, tenantId: string): Promise<TEntity | null>;
    abstract findAll(tenantId: string): Promise<TEntity[]>;
    abstract save(entity: TEntity): Promise<TEntity>;
    abstract delete(id: TId, tenantId: string, deletedBy?: string): Promise<void>;
    abstract exists(id: TId, tenantId: string): Promise<boolean>;
}
