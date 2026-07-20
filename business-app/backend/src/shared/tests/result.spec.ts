import { Result, ResultError } from '../application/result';
import { Either, Left, Right, left, right } from '../application/either';
import { ApplicationError } from '../application/application-error';

// ── Result<T> ─────────────────────────────────────────────────────────────────

describe('Result', () => {
  const SUCCESS_VALUE = { id: 'abc', name: 'Widget' };
  const ERROR: ResultError = { code: 'NOT_FOUND', message: 'Entity not found' };

  describe('ok()', () => {
    it('creates a successful result', () => {
      const r = Result.ok(SUCCESS_VALUE);
      expect(r.isOk).toBe(true);
      expect(r.isFail).toBe(false);
      expect(r.value).toBe(SUCCESS_VALUE);
    });

    it('ok() with void value', () => {
      const r = Result.ok(undefined);
      expect(r.isOk).toBe(true);
      expect(r.value).toBeUndefined();
    });
  });

  describe('fail()', () => {
    it('creates a failed result', () => {
      const r = Result.fail(ERROR);
      expect(r.isFail).toBe(true);
      expect(r.isOk).toBe(false);
      expect(r.error).toEqual(ERROR);
    });
  });

  describe('guards on .value and .error', () => {
    it('.value throws when result is a failure', () => {
      const r = Result.fail<string>(ERROR);
      expect(() => r.value).toThrow('Cannot get value from a failed Result');
    });

    it('.error throws when result is a success', () => {
      const r = Result.ok('hello');
      expect(() => r.error).toThrow(
        'Cannot get error from a successful Result',
      );
    });
  });

  describe('map()', () => {
    it('transforms value on success', () => {
      const r = Result.ok(5).map((v) => v * 2);
      expect(r.isOk).toBe(true);
      expect(r.value).toBe(10);
    });

    it('does not call transform on failure — passes error through', () => {
      const fn = jest.fn();
      const r = Result.fail<number>(ERROR).map(fn);
      expect(fn).not.toHaveBeenCalled();
      expect(r.isFail).toBe(true);
      expect(r.error).toEqual(ERROR);
    });
  });

  describe('getOrElse()', () => {
    it('returns value on success', () => {
      expect(Result.ok(42).getOrElse(0)).toBe(42);
    });

    it('returns fallback on failure', () => {
      expect(Result.fail<number>(ERROR).getOrElse(-1)).toBe(-1);
    });
  });

  describe('typed errors (DomainError subclasses)', () => {
    it('works with ApplicationError as error type', () => {
      const err = new ApplicationError('VALIDATION', 'Invalid input', {
        field: 'email',
      });
      const r = Result.fail(err);
      expect(r.error.code).toBe('VALIDATION');
      expect(r.error.message).toBe('Invalid input');
    });

    it('error.details is accessible when present', () => {
      const err = new ApplicationError('CONFLICT', 'Duplicate', {
        key: 'email',
      });
      const r = Result.fail(err);
      expect(r.error.details).toEqual({ key: 'email' });
    });
  });

  describe('use case return pattern', () => {
    type CreateWidgetResponse = { id: string };

    async function createWidget(
      name: string,
    ): Promise<Result<CreateWidgetResponse>> {
      if (!name)
        return Result.fail({ code: 'VALIDATION', message: 'Name required' });
      return Result.ok({ id: 'generated-id' });
    }

    it('succeeds when input is valid', async () => {
      const result = await createWidget('My Widget');
      expect(result.isOk).toBe(true);
      expect(result.value.id).toBe('generated-id');
    });

    it('fails when input is invalid', async () => {
      const result = await createWidget('');
      expect(result.isFail).toBe(true);
      expect(result.error.code).toBe('VALIDATION');
    });
  });
});

// ── Either<L, R> ─────────────────────────────────────────────────────────────

describe('Either', () => {
  describe('left()', () => {
    it('creates a Left value', () => {
      const e: Either<string, number> = left('error');
      expect(e.isLeft()).toBe(true);
      expect(e.isRight()).toBe(false);
    });

    it('Left.value holds the left value', () => {
      const e = left<string, number>('error-code');
      expect((e as Left<string, number>).value).toBe('error-code');
    });
  });

  describe('right()', () => {
    it('creates a Right value', () => {
      const e: Either<string, number> = right(42);
      expect(e.isRight()).toBe(true);
      expect(e.isLeft()).toBe(false);
    });

    it('Right.value holds the right value', () => {
      const e = right<string, number>(42);
      expect((e as Right<string, number>).value).toBe(42);
    });
  });

  describe('type narrowing', () => {
    it('isLeft() narrows type to Left', () => {
      const e: Either<string, number> = left('err');
      if (e.isLeft()) {
        // TypeScript narrows to Left<string, number>
        expect(e.value).toBe('err');
      } else {
        fail('Should have been Left');
      }
    });

    it('isRight() narrows type to Right', () => {
      const e: Either<string, number> = right(99);
      if (e.isRight()) {
        expect(e.value).toBe(99);
      } else {
        fail('Should have been Right');
      }
    });
  });

  describe('fold() equivalent — isLeft/isRight pattern', () => {
    // Either does not implement fold() — use isLeft/isRight for the same result.
    // This test demonstrates the pattern Sprint 1 teams should use.
    function fold<L, R, T>(
      either: Either<L, R>,
      onLeft: (v: L) => T,
      onRight: (v: R) => T,
    ): T {
      return either.isLeft() ? onLeft(either.value) : onRight(either.value);
    }

    it('fold pattern works for left branch', () => {
      const e: Either<string, number> = left('ERROR');
      const result = fold(
        e,
        (err) => `Error: ${err}`,
        (val) => `Value: ${val}`,
      );
      expect(result).toBe('Error: ERROR');
    });

    it('fold pattern works for right branch', () => {
      const e: Either<string, number> = right(42);
      const result = fold(
        e,
        (err) => `Error: ${err}`,
        (val) => `Value: ${val}`,
      );
      expect(result).toBe('Value: 42');
    });
  });

  describe('real-world usage', () => {
    type ParseError = { reason: string };
    type ParsedId = { id: string };

    function parseId(input: string): Either<ParseError, ParsedId> {
      if (!input || input.length < 3) return left({ reason: 'ID too short' });
      return right({ id: input });
    }

    it('returns Right for valid input', () => {
      const result = parseId('abc-123');
      expect(result.isRight()).toBe(true);
    });

    it('returns Left for invalid input', () => {
      const result = parseId('ab');
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.reason).toBe('ID too short');
      }
    });
  });
});
