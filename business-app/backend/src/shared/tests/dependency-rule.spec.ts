import * as fs from 'fs';
import * as path from 'path';

/**
 * T00-708 — Shared Dependency Rule Guard
 *
 * Verifies that nothing inside src/shared/ (excluding tests/ and fake-domain/)
 * imports from domain modules external to shared/.
 *
 * This test runs automatically in CI and fails if the dependency boundary is violated.
 * To run manually: npx jest dependency-rule
 */

const SHARED_SRC = path.resolve(__dirname, '..');

// Modules that shared/ must never import (relative paths from anywhere inside shared/)
const FORBIDDEN_MODULES = [
  'platform',
  'revenue',
  'billing',
  'calendar',
  'analytics',
  'communications',
  'document-modules',
  'document-management',
  'work',
  'customer',
  'settings',
];

function getAllTsFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Exclude test directories themselves from the scan — only scan production code
      if (entry.name !== 'tests') {
        getAllTsFiles(fullPath, files);
      }
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractImports(content: string): string[] {
  const importRegex =
    /^import\s+(?:type\s+)?(?:[\w{},\s*]+from\s+)?['"](.+?)['"]/gm;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

describe('Shared Foundation — Dependency Rule (T00-708)', () => {
  const files = getAllTsFiles(SHARED_SRC);

  it('shared/ production code exists and was scanned', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('no shared/ file imports from a domain module external to shared/', () => {
    const violations: string[] = [];

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = extractImports(content);

      for (const importPath of imports) {
        if (!importPath.startsWith('.')) continue; // skip npm packages

        const resolved = path.resolve(path.dirname(filePath), importPath);

        if (!resolved.startsWith(SHARED_SRC)) {
          // Relative import goes outside src/shared/ — check if it hits a forbidden module
          const relativeToSrc = path.relative(
            path.join(SHARED_SRC, '..'),
            resolved,
          );
          const firstSegment = relativeToSrc.split(path.sep)[0];

          if (FORBIDDEN_MODULES.includes(firstSegment)) {
            const relFile = path.relative(SHARED_SRC, filePath);
            violations.push(
              `  ${relFile} → '${importPath}' (resolves to ${firstSegment}/)`,
            );
          }
        }
      }
    }

    if (violations.length > 0) {
      fail(
        `Dependency Rule violated — shared/ imports from domain modules:\n${violations.join('\n')}`,
      );
    }
  });

  it('shared/ only depends on npm packages and internal relative paths', () => {
    const externalPackages = new Set<string>();

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = extractImports(content);
      for (const imp of imports) {
        if (!imp.startsWith('.')) {
          externalPackages.add(imp.split('/')[0]);
        }
      }
    }

    const ALLOWED_PACKAGES = [
      'crypto',
      '@nestjs',
      'mongoose',
      'reflect-metadata',
    ];

    const unexpectedPackages = [...externalPackages].filter(
      (pkg) =>
        !ALLOWED_PACKAGES.some((allowed) =>
          pkg.startsWith(allowed.replace('/', '')),
        ),
    );

    if (unexpectedPackages.length > 0) {
      fail(
        `shared/ imports unexpected external packages: ${unexpectedPackages.join(', ')}\n` +
          `If intentional, add to ALLOWED_PACKAGES in dependency-rule.spec.ts`,
      );
    }
  });
});

// ── Usage documentation ───────────────────────────────────────────────────────

describe('Dependency Rule — how to run', () => {
  it('documents the command to run this check manually', () => {
    // To run only this suite: npx jest dependency-rule --testPathPattern=shared
    // To run all shared tests:  npx jest --testPathPattern=src/shared/tests
    expect(true).toBe(true);
  });
});
