// src/files/generator/validators/contract-field.validator.ts
//
// Validates the typed field definitions stored inside a format contract.
// This runs at contract-save time alongside the existing structural checks.

import { FIELD_TYPES } from '../types/field-definition.types';

export interface FieldValidationError {
  path: string;
  message: string;
}

/**
 * Validates one field definition object.
 * Returns a list of error strings (empty = valid).
 */
export function validateFieldDefinition(
  field: Record<string, any>,
  contextPath: string,
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];

  if (!field.key?.toString().trim()) {
    errors.push({ path: `${contextPath}.key`, message: 'key is required' });
  }

  if (field.type && !(FIELD_TYPES as readonly string[]).includes(field.type)) {
    errors.push({
      path: `${contextPath}.type`,
      message: `"${field.type}" is not a valid field type. Allowed: ${FIELD_TYPES.join(', ')}`,
    });
  }

  if (
    field.minimum !== undefined &&
    field.minimum !== null &&
    typeof field.minimum !== 'number'
  ) {
    errors.push({
      path: `${contextPath}.minimum`,
      message: 'minimum must be a number or null',
    });
  }

  if (
    field.maximum !== undefined &&
    field.maximum !== null &&
    typeof field.maximum !== 'number'
  ) {
    errors.push({
      path: `${contextPath}.maximum`,
      message: 'maximum must be a number or null',
    });
  }

  if (
    typeof field.minimum === 'number' &&
    typeof field.maximum === 'number' &&
    field.minimum > field.maximum
  ) {
    errors.push({
      path: `${contextPath}.minimum`,
      message: `minimum (${field.minimum}) must not exceed maximum (${field.maximum})`,
    });
  }

  if (
    field.allowedValues !== undefined &&
    !Array.isArray(field.allowedValues)
  ) {
    errors.push({
      path: `${contextPath}.allowedValues`,
      message: 'allowedValues must be an array',
    });
  }

  return errors;
}

/**
 * Validates an array of field definitions, prefixing each error with the array path.
 */
export function validateFieldDefinitions(
  fields: any[],
  arrayPath: string,
): FieldValidationError[] {
  if (!Array.isArray(fields)) return [];
  const errors: FieldValidationError[] = [];
  const keys = new Set<string>();

  fields.forEach((f, i) => {
    errors.push(...validateFieldDefinition(f, `${arrayPath}[${i}]`));

    if (f.key) {
      if (keys.has(f.key)) {
        errors.push({
          path: `${arrayPath}[${i}].key`,
          message: `duplicate field key "${f.key}"`,
        });
      }
      keys.add(f.key);
    }
  });

  return errors;
}

/**
 * Validates all field/column definitions in a format contract.
 * Returns flat list of error messages suitable for the existing HttpException shape.
 */
export function validateContractFieldDefinitions(
  format: string,
  contract: Record<string, any>,
): string[] {
  const allErrors: FieldValidationError[] = [];

  if (format === 'pdf') {
    const sections: any[] = Array.isArray(contract.sections)
      ? contract.sections
      : [];
    sections.forEach((section, i) => {
      const base = `pdf.sections[${i}]`;
      if (Array.isArray(section.fields)) {
        allErrors.push(
          ...validateFieldDefinitions(section.fields, `${base}.fields`),
        );
      }
      if (Array.isArray(section.columns)) {
        allErrors.push(
          ...validateFieldDefinitions(section.columns, `${base}.columns`),
        );
      }
    });
  }

  if (format === 'xlsx') {
    const worksheets: any[] = Array.isArray(contract.worksheets)
      ? contract.worksheets
      : [];
    worksheets.forEach((ws, i) => {
      if (Array.isArray(ws.columns)) {
        allErrors.push(
          ...validateFieldDefinitions(
            ws.columns,
            `xlsx.worksheets[${i}].columns`,
          ),
        );
      }
    });
  }

  if (format === 'csv') {
    if (Array.isArray(contract.columns)) {
      allErrors.push(
        ...validateFieldDefinitions(contract.columns, 'csv.columns'),
      );
    }
  }

  return allErrors.map((e) => `${e.path}: ${e.message}`);
}
