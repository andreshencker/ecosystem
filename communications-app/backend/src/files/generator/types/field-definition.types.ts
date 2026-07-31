// src/files/generator/types/field-definition.types.ts

export const FIELD_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'time',
  'datetime',
  'currency',
  'percentage',
  'email',
  'object',
  'array',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const DATA_TYPES = ['array', 'object', 'value'] as const;
export type DataType = (typeof DATA_TYPES)[number];

/**
 * Describes a single expected data field inside a contract section, worksheet or CSV row.
 * All properties are optional at the schema level for backward compatibility.
 * Meaning: a contract saved without type/required still loads fine.
 */
export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  /** Field-level format hint, e.g. 'currency', 'date', 'YYYY-MM-DD', '#,##0.00' */
  format?: string;
  minimum?: number | null;
  maximum?: number | null;
  allowedValues?: string[];
  defaultValue?: string | null;
}
