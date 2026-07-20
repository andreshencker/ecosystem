export abstract class BusinessRule {
  abstract isBroken(): boolean;
  abstract get message(): string;
}
