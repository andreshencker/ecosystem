/**
 * Migration: breakMinutes → breakTaken
 *
 * Replaces the legacy `breakMinutes: number | null` field on every Shift document
 * with the new `breakTaken: boolean` field.
 *
 * Migration rule:
 *   breakMinutes > 0          → breakTaken = true   (worker took a break)
 *   breakMinutes missing / null / 0 / negative → breakTaken = false
 *
 * This script is idempotent: re-running it on already-migrated documents
 * (where breakMinutes is absent) will set breakTaken = false, which is correct.
 *
 * HOW TO RUN:
 *   ts-node -e "require('./break-minutes-to-break-taken.migration').runMigration()"
 *
 * Or add a one-off NestJS CLI command if that pattern exists in this project.
 *
 * DO NOT execute this automatically at application startup.
 */

import { MongoClient } from 'mongodb';

export async function runMigration(uri?: string): Promise<void> {
  const mongoUri = uri ?? process.env['MONGODB_URI'];
  if (!mongoUri) throw new Error('MONGODB_URI is required');

  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const db = client.db();
    const collection = db.collection('shifts');

    // Step 1: shifts with breakMinutes > 0 → breakTaken = true
    const trueResult = await collection.updateMany(
      { breakMinutes: { $gt: 0 } },
      [
        { $set: { breakTaken: true } },
        { $unset: ['breakMinutes'] },
      ],
    );

    // Step 2: all remaining shifts (breakMinutes missing, null, 0, or negative) → breakTaken = false
    const falseResult = await collection.updateMany(
      { breakTaken: { $exists: false } },
      [
        { $set: { breakTaken: false } },
        { $unset: ['breakMinutes'] },
      ],
    );

    // Step 3: clean up any lingering breakMinutes field (edge case: breakMinutes = 0 or negative already migrated)
    await collection.updateMany(
      { breakMinutes: { $exists: true } },
      { $unset: { breakMinutes: '' } },
    );

    console.log(`[migration] breakMinutes→breakTaken complete.`);
    console.log(`  Migrated to breakTaken=true:  ${trueResult.modifiedCount}`);
    console.log(`  Migrated to breakTaken=false: ${falseResult.modifiedCount}`);
  } finally {
    await client.close();
  }
}
