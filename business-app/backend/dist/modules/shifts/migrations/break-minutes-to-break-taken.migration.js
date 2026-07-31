"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigration = runMigration;
const mongodb_1 = require("mongodb");
async function runMigration(uri) {
    const mongoUri = uri ?? process.env['MONGODB_URI'];
    if (!mongoUri)
        throw new Error('MONGODB_URI is required');
    const client = new mongodb_1.MongoClient(mongoUri);
    await client.connect();
    try {
        const db = client.db();
        const collection = db.collection('shifts');
        const trueResult = await collection.updateMany({ breakMinutes: { $gt: 0 } }, [
            { $set: { breakTaken: true } },
            { $unset: ['breakMinutes'] },
        ]);
        const falseResult = await collection.updateMany({ breakTaken: { $exists: false } }, [
            { $set: { breakTaken: false } },
            { $unset: ['breakMinutes'] },
        ]);
        await collection.updateMany({ breakMinutes: { $exists: true } }, { $unset: { breakMinutes: '' } });
        console.log(`[migration] breakMinutes→breakTaken complete.`);
        console.log(`  Migrated to breakTaken=true:  ${trueResult.modifiedCount}`);
        console.log(`  Migrated to breakTaken=false: ${falseResult.modifiedCount}`);
    }
    finally {
        await client.close();
    }
}
//# sourceMappingURL=break-minutes-to-break-taken.migration.js.map