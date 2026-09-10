import * as SQLite from 'expo-sqlite';

export const getDB = () => {
    return SQLite.openDatabaseSync('akiri_offline.db');
};

export const initDB = () => {
    const db = getDB();
    db.execSync(`
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            collector_alias_code TEXT NOT NULL,
            material_category TEXT NOT NULL,
            raw_weight_kg REAL NOT NULL,
            completeness_index REAL,
            density_anomaly_flag INTEGER DEFAULT 0,
            final_payout_amt REAL,
            status TEXT DEFAULT 'PENDING',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            synced INTEGER DEFAULT 0
        );
    `);
};

export interface LocalTransaction {
    id: string;
    collector_alias_code: string;
    material_category: string;
    raw_weight_kg: number;
    completeness_index?: number;
    density_anomaly_flag?: boolean;
    final_payout_amt?: number;
    status?: string;
    created_at?: string;
    synced?: boolean;
}

export const saveTransactionLocally = (tx: LocalTransaction) => {
    const db = getDB();
    const statement = db.prepareSync(
        `INSERT INTO transactions (
            id, collector_alias_code, material_category, raw_weight_kg, 
            completeness_index, density_anomaly_flag, final_payout_amt, 
            status, synced
        ) VALUES (
            $id, $collector_alias_code, $material_category, $raw_weight_kg, 
            $completeness_index, $density_anomaly_flag, $final_payout_amt, 
            $status, 0
        )`
    );

    statement.executeSync({
        $id: tx.id,
        $collector_alias_code: tx.collector_alias_code,
        $material_category: tx.material_category,
        $raw_weight_kg: tx.raw_weight_kg,
        $completeness_index: tx.completeness_index || null,
        $density_anomaly_flag: tx.density_anomaly_flag ? 1 : 0,
        $final_payout_amt: tx.final_payout_amt || null,
        $status: tx.status || 'PENDING'
    });
};

export const getPendingUnsyncedTransactions = (): LocalTransaction[] => {
    const db = getDB();
    const results = db.getAllSync('SELECT * FROM transactions WHERE synced = 0');
    return results as LocalTransaction[];
};

export const markTransactionAsSynced = (id: string) => {
    const db = getDB();
    const statement = db.prepareSync('UPDATE transactions SET synced = 1 WHERE id = $id');
    statement.executeSync({ $id: id });
};

export const getAllTransactions = (): LocalTransaction[] => {
    const db = getDB();
    const results = db.getAllSync('SELECT * FROM transactions ORDER BY created_at DESC');
    return results as LocalTransaction[];
};


