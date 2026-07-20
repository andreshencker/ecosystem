import { BaseRepository } from '../../infrastructure/base-repository.abstract';
import { FakeAggregate } from './fake-aggregate';

interface StoredEntry {
  entity: FakeAggregate;
  deletedAt: Date | null;
  deletedBy: string | null;
}

/**
 * In-memory repository that enforces the same tenant isolation and soft-delete
 * policy as MongoRepositoryBase. Use this in unit tests instead of a real DB.
 *
 * Sprint 1 teams can use this pattern to build their own in-memory repositories
 * for domain unit tests.
 */
export class FakeInMemoryRepository extends BaseRepository<
  FakeAggregate,
  string
> {
  private readonly store = new Map<string, StoredEntry>();

  async findById(id: string, tenantId: string): Promise<FakeAggregate | null> {
    const entry = this.store.get(id);
    if (
      !entry ||
      entry.deletedAt !== null ||
      entry.entity.tenantId !== tenantId
    ) {
      return null;
    }
    return entry.entity;
  }

  async findAll(tenantId: string): Promise<FakeAggregate[]> {
    return [...this.store.values()]
      .filter((e) => e.entity.tenantId === tenantId && e.deletedAt === null)
      .map((e) => e.entity);
  }

  async save(entity: FakeAggregate): Promise<FakeAggregate> {
    const existing = this.store.get(entity.id);
    this.store.set(entity.id, {
      entity,
      deletedAt: existing?.deletedAt ?? null,
      deletedBy: existing?.deletedBy ?? null,
    });
    return entity;
  }

  async delete(
    id: string,
    tenantId: string,
    deletedBy?: string,
  ): Promise<void> {
    const entry = this.store.get(id);
    if (
      !entry ||
      entry.entity.tenantId !== tenantId ||
      entry.deletedAt !== null
    ) {
      return; // idempotent — already deleted or wrong tenant
    }
    this.store.set(id, {
      ...entry,
      deletedAt: new Date(),
      deletedBy: deletedBy ?? null,
    });
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    const entry = this.store.get(id);
    return (
      !!entry && entry.entity.tenantId === tenantId && entry.deletedAt === null
    );
  }

  /** Test helper: inspect soft-deleted entries without bypassing the contract. */
  findDeletedEntry(id: string): StoredEntry | undefined {
    const entry = this.store.get(id);
    return entry?.deletedAt !== null ? entry : undefined;
  }

  /** Test helper: reset store between tests. */
  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
