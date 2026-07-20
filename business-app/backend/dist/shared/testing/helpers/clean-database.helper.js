"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanDatabase = cleanDatabase;
async function cleanDatabase(connection) {
    if (!connection.db)
        return;
    const collections = await connection.db.listCollections().toArray();
    await Promise.all(collections.map((col) => connection.db.collection(col.name).deleteMany({})));
}
//# sourceMappingURL=clean-database.helper.js.map