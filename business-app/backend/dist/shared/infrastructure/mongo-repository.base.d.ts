import { Document, Model } from 'mongoose';
import { BaseRepository } from './base-repository.abstract';
export declare abstract class MongoRepositoryBase<TEntity, TDocument extends Document, TId extends string = string> extends BaseRepository<TEntity, TId> {
    protected readonly model: Model<TDocument>;
    protected constructor(model: Model<TDocument>);
    protected abstract toDomain(doc: TDocument): TEntity;
    abstract save(entity: TEntity): Promise<TEntity>;
    findById(id: TId, tenantId: string): Promise<TEntity | null>;
    findAll(tenantId: string): Promise<TEntity[]>;
    delete(id: TId, tenantId: string, deletedBy?: string): Promise<void>;
    exists(id: TId, tenantId: string): Promise<boolean>;
}
