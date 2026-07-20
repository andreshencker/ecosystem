import { Connection } from 'mongoose';

export async function cleanDatabase(connection: Connection): Promise<void> {
  if (!connection.db) return;
  const collections = await connection.db.listCollections().toArray();
  await Promise.all(
    collections.map((col) =>
      connection.db!.collection(col.name).deleteMany({}),
    ),
  );
}
