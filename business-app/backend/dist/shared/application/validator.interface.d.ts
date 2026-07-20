export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}
export interface Validator<T> {
    validate(value: T): ValidationResult;
}
