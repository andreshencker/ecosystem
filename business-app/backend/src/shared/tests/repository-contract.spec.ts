import { randomUUID } from 'crypto';
import { BaseRepository } from '../infrastructure/base-repository.abstract';
import { FakeAggregate } from '../testing/fake-domain/fake-aggregate';
import { FakeInMemoryRepository } from '../testing/fake-domain/fake-repository';

/**
 * Reusable repository contract suite.
 * Sprint 1 teams can call describeRepositoryContract() with their concrete
 * repository to validate tenant isolation and soft-delete automatically.
 */
function describeRepositoryContract(
  suiteName: string,
  factory: () => {
    repo: BaseRepository<FakeAggregate, string>;
    reset: () => void;
  },
): void {
  describe(`${suiteName} — Repository Contract`, () => {
    let repo: BaseRepository<FakeAggregate, string>;
    let reset: () => void;

    const TENANT_A = randomUUID();
    const TENANT_B = randomUUID();

    beforeEach(() => {
      ({ repo, reset } = factory());
    });

    afterEach(() => {
      reset();
    });

    // ── save / findById ────────────────────────────────────────────────────

    it('saves and retrieves an entity by id within the same tenant', async () => {
      const entity = FakeAggregate.create(TENANT_A, 'Widget');
      await repo.save(entity);

      const found = await repo.findById(entity.id, TENANT_A);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(entity.id);
      expect(found!.name).toBe('Widget');
    });

    it('findById returns null for unknown id', async () => {
      const found = await repo.findById(randomUUID(), TENANT_A);
      expect(found).toBeNull();
    });

    // ── tenant isolation ───────────────────────────────────────────────────

    it('findById returns null when tenantId does not match — cross-tenant leak blocked', async () => {
      const entity = FakeAggregate.create(TENANT_A, 'SecretWidget');
      await repo.save(entity);

      const leaked = await repo.findById(entity.id, TENANT_B);
      expect(leaked).toBeNull();
    });

    it('findAll returns only entities for the given tenant', async () => {
      const a1 = FakeAggregate.create(TENANT_A, 'Alpha');
      const a2 = FakeAggregate.create(TENANT_A, 'Beta');
      const b1 = FakeAggregate.create(TENANT_B, 'Gamma');
      await Promise.all([repo.save(a1), repo.save(a2), repo.save(b1)]);

      const tenantAResults = await repo.findAll(TENANT_A);
      expect(tenantAResults).toHaveLength(2);
      expect(tenantAResults.map((e) => e.id)).toEqual(
        expect.arrayContaining([a1.id, a2.id]),
      );
      expect(tenantAResults.map((e) => e.id)).not.toContain(b1.id);
    });

    it('findAll returns empty array when tenant has no entities', async () => {
      const results = await repo.findAll(randomUUID());
      expect(results).toEqual([]);
    });

    // ── soft delete ────────────────────────────────────────────────────────

    it('delete does NOT physically remove the record', async () => {
      const entity = FakeAggregate.create(TENANT_A, 'ToDelete');
      await repo.save(entity);

      await repo.delete(entity.id, TENANT_A);

      // Must not be visible in normal reads
      const found = await repo.findById(entity.id, TENANT_A);
      expect(found).toBeNull();
    });

    it('deleted entity does not appear in findAll', async () => {
      const live = FakeAggregate.create(TENANT_A, 'Live');
      const dead = FakeAggregate.create(TENANT_A, 'Dead');
      await repo.save(live);
      await repo.save(dead);

      await repo.delete(dead.id, TENANT_A);

      const results = await repo.findAll(TENANT_A);
      expect(results.map((e) => e.id)).toContain(live.id);
      expect(results.map((e) => e.id)).not.toContain(dead.id);
    });

    it('delete is idempotent — deleting twice does not throw', async () => {
      const entity = FakeAggregate.create(TENANT_A, 'ToDelete');
      await repo.save(entity);

      await repo.delete(entity.id, TENANT_A);
      await expect(repo.delete(entity.id, TENANT_A)).resolves.not.toThrow();
    });

    it('delete with wrong tenantId is a no-op — cross-tenant delete blocked', async () => {
      const entity = FakeAggregate.create(TENANT_A, 'Protected');
      await repo.save(entity);

      await repo.delete(entity.id, TENANT_B); // wrong tenant

      // Entity must still be visible to TENANT_A
      const stillThere = await repo.findById(entity.id, TENANT_A);
      expect(stillThere).not.toBeNull();
    });

    // ── exists ─────────────────────────────────────────────────────────────

    it('exists returns true for active entity in correct tenant', async () => {
      const entity = FakeAggregate.create(TENANT_A, 'Present');
      await repo.save(entity);

      expect(await repo.exists(entity.id, TENANT_A)).toBe(true);
    });

    it('exists returns false for unknown id', async () => {
      expect(await repo.exists(randomUUID(), TENANT_A)).toBe(false);
    });

    it('exists returns false after soft delete', async () => {
      const entity = FakeAggregate.create(TENANT_A, 'Present');
      await repo.save(entity);
      await repo.delete(entity.id, TENANT_A);

      expect(await repo.exists(entity.id, TENANT_A)).toBe(false);
    });

    it('exists returns false when tenantId does not match', async () => {
      const entity = FakeAggregate.create(TENANT_A, 'Present');
      await repo.save(entity);

      expect(await repo.exists(entity.id, TENANT_B)).toBe(false);
    });

    // ── save semantics ─────────────────────────────────────────────────────

    it('save updates an existing entity', async () => {
      const entity = FakeAggregate.create(TENANT_A, 'Original');
      await repo.save(entity);

      entity.rename('Updated');
      await repo.save(entity);

      const found = await repo.findById(entity.id, TENANT_A);
      expect(found!.name).toBe('Updated');
    });
  });
}

// ── Run the contract suite against the in-memory implementation ─────────────

describeRepositoryContract('FakeInMemoryRepository', () => {
  const inMemory = new FakeInMemoryRepository();
  return {
    repo: inMemory,
    reset: () => inMemory.clear(),
  };
});

// ── Additional FakeInMemoryRepository-specific tests ────────────────────────

describe('FakeInMemoryRepository — soft delete record retention', () => {
  it('physically stores the soft-deleted record (not hard deleted)', async () => {
    const repo = new FakeInMemoryRepository();
    const entity = FakeAggregate.create(randomUUID(), 'ToSoftDelete');
    await repo.save(entity);

    await repo.delete(entity.id, entity.tenantId, 'user-123');

    // Access the underlying store entry to prove it's still there
    const deletedEntry = repo.findDeletedEntry(entity.id);
    expect(deletedEntry).toBeDefined();
    expect(deletedEntry!.deletedAt).not.toBeNull();
    expect(deletedEntry!.deletedBy).toBe('user-123');
  });
});
