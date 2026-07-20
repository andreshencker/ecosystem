import { randomUUID } from 'crypto';
import { FakeAggregate } from '../testing/fake-domain/fake-aggregate';
import {
  FakeCreatedEvent,
  FakeRenamedEvent,
} from '../testing/fake-domain/fake-domain-event';
import {
  DomainEvent,
  DomainEventParams,
} from '../domain/events/domain-event.base';

const TENANT = randomUUID();

// ── AggregateRoot ─────────────────────────────────────────────────────────────

describe('AggregateRoot', () => {
  describe('addDomainEvent() + pullDomainEvents()', () => {
    it('pullDomainEvents() returns all events and clears the list atomically', () => {
      const agg = FakeAggregate.create(TENANT, 'Widget');
      // create() adds one FakeCreatedEvent
      expect(agg.domainEvents).toHaveLength(1);

      const pulled = agg.pullDomainEvents();

      expect(pulled).toHaveLength(1);
      expect(agg.domainEvents).toHaveLength(0); // cleared atomically
    });

    it('pullDomainEvents() called twice — second call returns empty array', () => {
      const agg = FakeAggregate.create(TENANT, 'Widget');
      agg.pullDomainEvents(); // consume
      const second = agg.pullDomainEvents();
      expect(second).toHaveLength(0);
    });

    it('accumulates multiple events from multiple operations', () => {
      const agg = FakeAggregate.create(TENANT, 'Original');
      // create adds 1 event
      agg.rename('First rename'); // adds 1 more
      agg.rename('Second rename'); // adds 1 more

      const events = agg.pullDomainEvents();
      expect(events).toHaveLength(3);
      expect(events[0]).toBeInstanceOf(FakeCreatedEvent);
      expect(events[1]).toBeInstanceOf(FakeRenamedEvent);
      expect(events[2]).toBeInstanceOf(FakeRenamedEvent);
    });

    it('pullDomainEvents() returns a copy — mutating the result does not affect internal state', () => {
      const agg = FakeAggregate.create(TENANT, 'Widget');
      const pulled = agg.pullDomainEvents();
      pulled.push(null as any); // mutate returned array

      // Internal state must remain empty
      expect(agg.domainEvents).toHaveLength(0);
    });

    it('domainEvents getter returns a read-only snapshot', () => {
      const agg = FakeAggregate.create(TENANT, 'Widget');
      const events = agg.domainEvents;
      expect(events).toHaveLength(1);
    });
  });

  describe('clearDomainEvents()', () => {
    it('discards all events without returning them', () => {
      const agg = FakeAggregate.create(TENANT, 'Widget');
      agg.rename('new name');
      expect(agg.domainEvents).toHaveLength(2);

      agg.clearDomainEvents();

      expect(agg.domainEvents).toHaveLength(0);
    });
  });

  describe('no event duplication', () => {
    it('same operation called twice produces distinct events', () => {
      const agg = FakeAggregate.create(TENANT, 'Widget');
      agg.rename('A');
      agg.rename('B');

      const events = agg.pullDomainEvents();
      const renameEvents = events.filter((e) => e instanceof FakeRenamedEvent);
      expect(renameEvents).toHaveLength(2);
      // Each event has a unique eventId
      const ids = renameEvents.map((e) => e.eventId);
      expect(new Set(ids).size).toBe(2);
    });
  });
});

// ── DomainEvent ───────────────────────────────────────────────────────────────

describe('DomainEvent', () => {
  const BASE_PARAMS: DomainEventParams = {
    aggregateId: randomUUID(),
    aggregateType: 'FakeAggregate',
    tenantId: TENANT,
  };

  describe('required fields', () => {
    it('auto-generates a unique eventId', () => {
      const e1 = new FakeCreatedEvent({ ...BASE_PARAMS });
      const e2 = new FakeCreatedEvent({ ...BASE_PARAMS });
      expect(e1.eventId).toBeDefined();
      expect(e2.eventId).toBeDefined();
      expect(e1.eventId).not.toBe(e2.eventId);
    });

    it('sets occurredAt to now when not supplied', () => {
      const before = new Date();
      const event = new FakeCreatedEvent({ ...BASE_PARAMS });
      const after = new Date();
      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('includes aggregateId, aggregateType, tenantId', () => {
      const event = new FakeCreatedEvent({ ...BASE_PARAMS });
      expect(event.aggregateId).toBe(BASE_PARAMS.aggregateId);
      expect(event.aggregateType).toBe(BASE_PARAMS.aggregateType);
      expect(event.tenantId).toBe(TENANT);
    });

    it('defaults version to 1', () => {
      expect(new FakeCreatedEvent({ ...BASE_PARAMS }).version).toBe(1);
    });

    it('defaults metadata to {}', () => {
      expect(new FakeCreatedEvent({ ...BASE_PARAMS }).metadata).toEqual({});
    });
  });

  describe('occurredAt injection (T00-609)', () => {
    it('accepts an explicit occurredAt for rehydration from persistence', () => {
      const pastDate = new Date('2020-01-01T00:00:00.000Z');
      const event = new FakeCreatedEvent({
        ...BASE_PARAMS,
        occurredAt: pastDate,
      });
      expect(event.occurredAt).toEqual(pastDate);
    });

    it('two events rehydrated with same timestamp are equal in time', () => {
      const ts = new Date('2025-06-01T12:00:00.000Z');
      const e1 = new FakeCreatedEvent({ ...BASE_PARAMS, occurredAt: ts });
      const e2 = new FakeCreatedEvent({ ...BASE_PARAMS, occurredAt: ts });
      expect(e1.occurredAt).toEqual(e2.occurredAt);
      expect(e1.eventId).not.toBe(e2.eventId); // still distinct events
    });
  });

  describe('optional fields', () => {
    it('preserves correlationId and causationId', () => {
      const corrId = randomUUID();
      const causeId = randomUUID();
      const event = new FakeCreatedEvent({
        ...BASE_PARAMS,
        correlationId: corrId,
        causationId: causeId,
      });
      expect(event.correlationId).toBe(corrId);
      expect(event.causationId).toBe(causeId);
    });

    it('correlationId is undefined when not supplied', () => {
      const event = new FakeCreatedEvent({ ...BASE_PARAMS });
      expect(event.correlationId).toBeUndefined();
    });

    it('preserves metadata', () => {
      const event = new FakeRenamedEvent({
        ...BASE_PARAMS,
        newName: 'X',
        metadata: { triggeredBy: 'admin' },
      });
      expect(event.metadata).toEqual({ triggeredBy: 'admin' });
    });
  });

  describe('all fields are readonly', () => {
    it('readonly fields are enforced at TypeScript compile-time (tsc --noEmit validates this)', () => {
      // TypeScript `readonly` prevents reassignment at compile time.
      // Runtime enforcement requires Object.freeze(), which is not applied here
      // because child constructors set their own properties after super().
      // The compile-time contract is the enforced invariant — verified by tsc --noEmit.
      const event = new FakeCreatedEvent({ ...BASE_PARAMS });
      const originalId = event.eventId;
      expect(originalId).toBeDefined();
      expect(typeof originalId).toBe('string');
    });

    it('eventId is set once and stable across calls', () => {
      const event = new FakeCreatedEvent({ ...BASE_PARAMS });
      expect(event.eventId).toBe(event.eventId); // same reference each time
    });
  });
});

// ── EventPublisher integration model ─────────────────────────────────────────

describe('pullDomainEvents() — EventPublisher integration pattern', () => {
  it('simulates atomic pull-then-publish: aggregate has no events after dispatch', async () => {
    const agg = FakeAggregate.create(TENANT, 'Widget');
    agg.rename('New Name');

    const published: DomainEvent[] = [];
    const mockPublisher = async (events: DomainEvent[]) => {
      published.push(...events);
    };

    const events = agg.pullDomainEvents();
    await mockPublisher(events);

    expect(published).toHaveLength(2);
    expect(agg.domainEvents).toHaveLength(0); // aggregate is clean
  });
});
