import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) db = SQLite.openDatabaseSync("akiri.db");
  return db;
}

/** Local tables: lots double as the idempotent sync queue via synced=0. */
export async function migrate(): Promise<void> {
  const d = getDb();
  await d.execAsync(`
    CREATE TABLE IF NOT EXISTS lots (
      id TEXT PRIMARY KEY, category TEXT NOT NULL, weight_kg REAL NOT NULL,
      value_inr INTEGER NOT NULL, photo_uri TEXT, photo_hash TEXT,
      gps_lat REAL, gps_lng REAL, timestamp TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued', ledger_ref TEXT, synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS prices (
      category TEXT NOT NULL, location TEXT NOT NULL, rate_per_kg REAL NOT NULL,
      updated_at TEXT NOT NULL, PRIMARY KEY (category, location)
    );
    CREATE TABLE IF NOT EXISTS ledger_entries (
      hash TEXT PRIMARY KEY, prev_hash TEXT NOT NULL, lot_id TEXT NOT NULL,
      photo_hash TEXT NOT NULL, weight_kg REAL NOT NULL,
      gps_lat REAL, gps_lng REAL, timestamp TEXT NOT NULL,
      collector_id TEXT NOT NULL, recycler_id TEXT,
      confirmation TEXT, ref_code TEXT NOT NULL
    );
  `);
}
