import { BaseRepository } from '../../infrastructure/base-repository.abstract';
import { FakeAggregate } from './fake-aggregate';
interface StoredEntry {
    entity: FakeAggregate;
    deletedAt: Date | null;
    deletedBy: string | null;
}
export declare class FakeInMemoryRepository extends BaseRepository<FakeAggregate, string> {
    private readonly store;
    findById(id: string, tenantId: string): Promise<FakeAggregate | null>;
    findAll(tenantId: string): Promise<FakeAggregate[]>;
    save(entity: FakeAggregate): Promise<FakeAggregate>;
    delete(id: string, tenantId: string, deletedBy?: string): Promise<void>;
    exists(id: string, tenantId: string): Promise<boolean>;
    findDeletedEntry(id: string): StoredEntry | undefined;
    clear(): void;
    get size(): number;
}
export {};
