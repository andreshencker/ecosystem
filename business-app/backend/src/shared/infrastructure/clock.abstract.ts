export abstract class Clock {
  abstract now(): Date;
  abstract nowIso(): string;
}

export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }

  nowIso(): string {
    return new Date().toISOString();
  }
}
