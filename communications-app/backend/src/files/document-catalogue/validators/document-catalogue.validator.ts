import { HttpException, HttpStatus } from '@nestjs/common';
import { validateContractFieldDefinitions } from '../../generator/validators/contract-field.validator';

/** Validates format contract integrity for a single format. */
export function validateFormatContract(
  format: string,
  contract: Record<string, any> | undefined,
  allowedFormats: string[],
): string[] {
  const errors: string[] = [];

  if (!allowedFormats.includes(format)) {
    errors.push(
      `Format "${format}" is not allowed by the parent domain (allowedFormats: ${allowedFormats.join(', ')})`,
    );
    return errors;
  }

  if (!contract) return errors;

  if (contract.enabled === true) {
    if (!contract.version?.trim())
      errors.push(`${format}.version is required when enabled`);
    // Only reject renderer when it is explicitly set to the wrong value.
    // Absent renderer is allowed for backward compatibility with pre-v2 contracts.
    if (contract.renderer && contract.renderer !== format) {
      errors.push(
        `${format}.renderer must be "${format}" (got "${contract.renderer}")`,
      );
    }

    if (format === 'pdf') {
      if (!contract.layoutType?.trim())
        errors.push('pdf.layoutType is required when enabled');

      // v2: validate section structure
      if (Array.isArray(contract.sections)) {
        const validSectionTypes = [
          'html',
          'summary',
          'table',
          'totals',
          'notes',
          '',
        ];
        contract.sections.forEach((s: any, i: number) => {
          if (s.type && !validSectionTypes.includes(s.type)) {
            errors.push(
              `pdf.sections[${i}].type "${s.type}" is not a supported PDF section type. Allowed: html, summary, table, totals, notes`,
            );
          }
          if (s.type === 'table' && s.enabled !== false) {
            if (!Array.isArray(s.columns) || s.columns.length === 0) {
              errors.push(
                `pdf.sections[${i}] (table "${s.key || s.label || '?'}"): must have at least one column definition when enabled`,
              );
            }
          }
        });
      }
    }

    if (format === 'xlsx') {
      if (
        !Array.isArray(contract.worksheets) ||
        contract.worksheets.length === 0
      ) {
        errors.push('xlsx must have at least one worksheet when enabled');
      } else {
        for (const ws of contract.worksheets) {
          if (!ws.key?.trim())
            errors.push('Each xlsx worksheet must have a key');
          if (!Array.isArray(ws.columns) || ws.columns.length === 0) {
            errors.push(
              `xlsx worksheet "${ws.key || '?'}" must have at least one column`,
            );
          }
          // v2: validate that column keys are unique within the worksheet
          if (Array.isArray(ws.columns)) {
            const colKeys = ws.columns.map((c: any) => c.key).filter(Boolean);
            const duplicates = colKeys.filter(
              (k: string, i: number) => colKeys.indexOf(k) !== i,
            );
            if (duplicates.length > 0) {
              errors.push(
                `xlsx worksheet "${ws.key}": duplicate column keys: ${[...new Set(duplicates)].join(', ')}`,
              );
            }
          }
        }
      }
    }

    if (format === 'csv') {
      if (!Array.isArray(contract.columns) || contract.columns.length === 0) {
        errors.push('csv must have at least one column when enabled');
      } else {
        // v2: validate column key uniqueness
        const colKeys = contract.columns.map((c: any) => c.key).filter(Boolean);
        const duplicates = colKeys.filter(
          (k: string, i: number) => colKeys.indexOf(k) !== i,
        );
        if (duplicates.length > 0) {
          errors.push(
            `csv: duplicate column keys: ${[...new Set(duplicates)].join(', ')}`,
          );
        }
      }
    }
  }

  // v1/v2: requiredFields and optionalFields must not overlap
  if (
    Array.isArray(contract.requiredFields) &&
    Array.isArray(contract.optionalFields)
  ) {
    const reqSet = new Set(contract.requiredFields);
    const overlap = (contract.optionalFields as string[]).filter((f) =>
      reqSet.has(f),
    );
    if (overlap.length > 0) {
      errors.push(
        `${format}: fields cannot appear in both requiredFields and optionalFields: ${overlap.join(', ')}`,
      );
    }
  }

  // v2: validate typed field/column definitions
  if (contract.enabled === true) {
    errors.push(...validateContractFieldDefinitions(format, contract));
  }

  return errors;
}

/** Throws HttpException if any format contract errors are found. */
export function assertFormatContractsValid(
  formatContracts: Record<string, any>,
  allowedFormats: string[],
): void {
  const allErrors: string[] = [];

  for (const [format, contract] of Object.entries(formatContracts)) {
    allErrors.push(...validateFormatContract(format, contract, allowedFormats));
  }

  if (allErrors.length > 0) {
    throw new HttpException(
      { message: 'Format contract validation failed', errors: allErrors },
      HttpStatus.BAD_REQUEST,
    );
  }
}
