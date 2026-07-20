import { Document, Model } from 'mongoose';
import { BaseRepository } from './base-repository.abstract';

export abstract class MongoRepositoryBase<
  TEntity,
  TDocument extends Document,
  TId extends string = string,
> extends BaseRepository<TEntity, TId> {
  protected constructor(protected readonly model: Model<TDocument>) {
    super();
  }

  protected abstract toDomain(doc: TDocument): TEntity;

  abstract save(entity: TEntity): Promise<TEntity>;

  async findById(id: TId, tenantId: string): Promise<TEntity | null> {
    const doc = await this.model
      .findOne({ _id: id, tenantId, deletedAt: null })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(tenantId: string): Promise<TEntity[]> {
    const docs = await this.model.find({ tenantId, deletedAt: null }).exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  /**
   * Soft delete: sets deletedAt and optionally deletedBy.
   * Hard delete does not exist in the base — use a migration script if physical removal is needed.
   */
  async delete(id: TId, tenantId: string, deletedBy?: string): Promise<void> {
    await this.model
      .updateOne(
        { _id: id, tenantId, deletedAt: null },
        {
          $set: {
            deletedAt: new Date(),
            ...(deletedBy !== undefined ? { deletedBy } : {}),
          },
        },
      )
      .exec();
  }

  async exists(id: TId, tenantId: string): Promise<boolean> {
    const count = await this.model
      .countDocuments({ _id: id, tenantId, deletedAt: null })
      .exec();
    return count > 0;
  }
}
