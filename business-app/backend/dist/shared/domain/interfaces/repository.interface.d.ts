export interface Repository<TEntity, TId> {
    findById(id: TId, tenantId: string): Promise<TEntity | null>;
    save(entity: TEntity): Promise<TEntity>;
    delete(id: TId, tenantId: string, deletedBy?: string): Promise<void>;
}
