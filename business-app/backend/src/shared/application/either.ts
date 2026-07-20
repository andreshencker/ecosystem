export type Either<L, R> = Left<L, R> | Right<L, R>;

export class Left<L, R> {
  private constructor(readonly value: L) {}

  static of<L, R>(value: L): Either<L, R> {
    return new Left<L, R>(value);
  }

  isLeft(): this is Left<L, R> {
    return true;
  }

  isRight(): this is Right<L, R> {
    return false;
  }
}

export class Right<L, R> {
  private constructor(readonly value: R) {}

  static of<L, R>(value: R): Either<L, R> {
    return new Right<L, R>(value);
  }

  isLeft(): this is Left<L, R> {
    return false;
  }

  isRight(): this is Right<L, R> {
    return true;
  }
}

export const left = <L, R>(value: L): Either<L, R> => Left.of<L, R>(value);
export const right = <L, R>(value: R): Either<L, R> => Right.of<L, R>(value);
