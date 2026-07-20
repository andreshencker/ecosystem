"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeInMemoryRepository = void 0;
const base_repository_abstract_1 = require("../../infrastructure/base-repository.abstract");
class FakeInMemoryRepository extends base_repository_abstract_1.BaseRepository {
    store = new Map();
    async findById(id, tenantId) {
        const entry = this.store.get(id);
        if (!entry ||
            entry.deletedAt !== null ||
            entry.entity.tenantId !== tenantId) {
            return null;
        }
        return entry.entity;
    }
    async findAll(tenantId) {
        return [...this.store.values()]
            .filter((e) => e.entity.tenantId === tenantId && e.deletedAt === null)
            .map((e) => e.entity);
    }
    async save(entity) {
        const existing = this.store.get(entity.id);
        this.store.set(entity.id, {
            entity,
            deletedAt: existing?.deletedAt ?? null,
            deletedBy: existing?.deletedBy ?? null,
        });
        return entity;
    }
    async delete(id, tenantId, deletedBy) {
        const entry = this.store.get(id);
        if (!entry ||
            entry.entity.tenantId !== tenantId ||
            entry.deletedAt !== null) {
            return;
        }
        this.store.set(id, {
            ...entry,
            deletedAt: new Date(),
            deletedBy: deletedBy ?? null,
        });
    }
    async exists(id, tenantId) {
        const entry = this.store.get(id);
        return (!!entry && entry.entity.tenantId === tenantId && entry.deletedAt === null);
    }
    findDeletedEntry(id) {
        const entry = this.store.get(id);
        return entry?.deletedAt !== null ? entry : undefined;
    }
    clear() {
        this.store.clear();
    }
    get size() {
        return this.store.size;
    }
}
exports.FakeInMemoryRepository = FakeInMemoryRepository;
//# sourceMappingURL=fake-repository.js.map