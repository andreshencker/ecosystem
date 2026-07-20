import { AggregateRoot } from '../../domain/entities/aggregate-root.base';
export declare class FakeAggregate extends AggregateRoot<string> {
    private _name;
    readonly tenantId: string;
    private constructor();
    static create(tenantId: string, name: string, id?: string): FakeAggregate;
    get name(): string;
    rename(newName: string): void;
}
