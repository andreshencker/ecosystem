// src/files/generator/validators/runtime-data.validator.ts
//
// Validates runtime data against a resolved format contract before generating a file.
// Returns structured errors with full dot-path messages.
// Never throws — always returns an array. Callers decide whether to abort.

import type { FieldDefinition } from '../types/field-definition.types';

export interface RuntimeValidationError {
  path: string;
  message: string;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Safely reads a nested value by dot-path. Returns undefined if any segment is missing.
 * e.g. getAtPath({ a: { b: [1,2] } }, 'a.b') → [1,2]
 */
export function getAtPath(obj: Record<string, any>, path: string): any {
  if (!path) return obj;
  return path.split('.').reduce<any>((cur, seg) => cur?.[seg], obj);
}

// ─── Primitive type checker ───────────────────────────────────────────────────

function checkFieldValue(
  value: any,
  field: Pick<
    FieldDefinition,
    'key' | 'type' | 'required' | 'minimum' | 'maximum' | 'allowedValues'
  >,
  valuePath: string,
): RuntimeValidationError[] {
  const errors: RuntimeValidationError[] = [];
  const missing = value === undefined || value === null || value === '';

  if (missing) {
    if (field.required) {
      errors.push({ path: valuePath, message: `${valuePath} is required` });
    }
    return errors;
  }

  // Type checks
  switch (field.type) {
    case 'number':
    case 'currency':
    case 'percentage':
      if (typeof value !== 'number' && isNaN(Number(value))) {
        errors.push({
          path: valuePath,
          message: `${valuePath} must be a number (got ${typeof value})`,
        });
      } else {
        const n = Number(value);
        if (
          field.minimum !== null &&
          field.minimum !== undefined &&
          n < field.minimum
        ) {
          errors.push({
            path: valuePath,
            message: `${valuePath} must be >= ${field.minimum}`,
          });
        }
        if (
          field.maximum !== null &&
          field.maximum !== undefined &&
          n > field.maximum
        ) {
          errors.push({
            path: valuePath,
            message: `${valuePath} must be <= ${field.maximum}`,
          });
        }
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({
          path: valuePath,
          message: `${valuePath} must be a boolean`,
        });
      }
      break;

    case 'date':
    case 'time':
    case 'datetime':
      if (typeof value !== 'string' && !(value instanceof Date)) {
        errors.push({
          path: valuePath,
          message: `${valuePath} must be a date string or Date`,
        });
      }
      break;

    case 'email':
      if (
        typeof value === 'string' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        errors.push({
          path: valuePath,
          message: `${valuePath} must be a valid email address`,
        });
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push({
          path: valuePath,
          message: `${valuePath} must be an array`,
        });
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push({
          path: valuePath,
          message: `${valuePath} must be an object`,
        });
      }
      break;
  }

  // Allowed values check
  if (Array.isArray(field.allowedValues) && field.allowedValues.length > 0) {
    const strVal = String(value);
    if (!field.allowedValues.includes(strVal)) {
      errors.push({
        path: valuePath,
        message: `${valuePath} must be one of: ${field.allowedValues.join(', ')} (got "${strVal}")`,
      });
    }
  }

  return errors;
}

// ─── Format-specific validators ───────────────────────────────────────────────

function validatePdfData(
  contract: Record<string, any>,
  data: Record<string, any>,
): RuntimeValidationError[] {
  const errors: RuntimeValidationError[] = [];
  const sections: any[] = Array.isArray(contract.sections)
    ? contract.sections
    : [];

  for (const section of sections) {
    if (section.enabled === false) continue;

    const sectionPath = section.dataPath?.trim();
    const rawValue = sectionPath ? getAtPath(data, sectionPath) : data;
    const isArray = section.dataType === 'array';
    const basePath = sectionPath || 'data';

    if (isArray) {
      if (!Array.isArray(rawValue)) {
        if (sectionPath) {
          errors.push({
            path: `data.${sectionPath}`,
            message: `data.${sectionPath} must be an array (required by section "${section.key || section.type}")`,
          });
        }
        continue;
      }

      const allFields: any[] = [
        ...(section.fields ?? []),
        ...(section.columns ?? []),
      ];
      rawValue.forEach((row: any, rowIdx: number) => {
        for (const field of allFields) {
          if (!field.key) continue;
          const valuePath = `data.${basePath}[${rowIdx}].${field.key}`;
          errors.push(...checkFieldValue(row?.[field.key], field, valuePath));
        }
      });
    } else {
      // object or value
      const allFields: any[] = [
        ...(section.fields ?? []),
        ...(section.columns ?? []),
      ];
      for (const field of allFields) {
        if (!field.key) continue;
        const valuePath = sectionPath
          ? `data.${sectionPath}.${field.key}`
          : `data.${field.key}`;
        errors.push(
          ...checkFieldValue(rawValue?.[field.key], field, valuePath),
        );
      }
    }
  }

  return errors;
}

function validateXlsxData(
  contract: Record<string, any>,
  data: Record<string, any>,
): RuntimeValidationError[] {
  const errors: RuntimeValidationError[] = [];
  const worksheets: any[] = Array.isArray(contract.worksheets)
    ? contract.worksheets
    : [];

  for (const ws of worksheets) {
    // v2 dataPath preferred over legacy dataSource
    const dataPath = ws.dataPath?.trim() || ws.dataSource?.trim();
    const rows = dataPath ? getAtPath(data, dataPath) : null;
    const basePath = dataPath || '(root)';

    if (!Array.isArray(rows)) {
      if (dataPath) {
        errors.push({
          path: `data.${dataPath}`,
          message: `data.${dataPath} must be an array (required by worksheet "${ws.key || ws.label}")`,
        });
      }
      continue;
    }

    const columns: any[] = Array.isArray(ws.columns) ? ws.columns : [];
    rows.forEach((row: any, rowIdx: number) => {
      for (const col of columns) {
        if (!col.key || !col.required) continue;
        const valuePath = `data.${basePath}[${rowIdx}].${col.key}`;
        errors.push(...checkFieldValue(row?.[col.key], col, valuePath));
      }
    });
  }

  return errors;
}

function validateCsvData(
  contract: Record<string, any>,
  data: Record<string, any>,
): RuntimeValidationError[] {
  const errors: RuntimeValidationError[] = [];

  // v2 dataPath preferred over legacy dataSource
  const dataPath = contract.dataPath?.trim() || contract.dataSource?.trim();
  const rows = dataPath ? getAtPath(data, dataPath) : null;

  if (!Array.isArray(rows)) {
    if (dataPath) {
      errors.push({
        path: `data.${dataPath}`,
        message: `data.${dataPath} must be an array (CSV source)`,
      });
    }
    return errors;
  }

  const columns: any[] = Array.isArray(contract.columns)
    ? contract.columns
    : [];
  rows.forEach((row: any, rowIdx: number) => {
    for (const col of columns) {
      if (!col.key || !col.required) continue;
      const valuePath = `data.${dataPath}[${rowIdx}].${col.key}`;
      errors.push(...checkFieldValue(row?.[col.key], col, valuePath));
    }
  });

  return errors;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validates runtime data against a resolved format contract.
 *
 * @param format  'pdf' | 'xlsx' | 'csv'
 * @param contract  The resolved format contract object (e.g. formatContracts.pdf)
 * @param data  The runtime data provided by the caller
 * @returns Array of error messages. Empty array = data is valid.
 */
export function validateRuntimeData(
  format: string,
  contract: Record<string, any>,
  data: Record<string, any>,
): string[] {
  let errors: RuntimeValidationError[] = [];

  switch (format) {
    case 'pdf':
      errors = validatePdfData(contract, data);
      break;
    case 'xlsx':
      errors = validateXlsxData(contract, data);
      break;
    case 'csv':
      errors = validateCsvData(contract, data);
      break;
    default:
      errors = [
        {
          path: 'format',
          message: `Runtime validation not implemented for format "${format}"`,
        },
      ];
  }

  return errors.map((e) => e.message);
}
