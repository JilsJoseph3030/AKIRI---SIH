import { getPendingUnsyncedTransactions, markTransactionAsSynced } from '../db/offline-sqlite';

export async function syncPendingTransactions(apiEndpoint: string) {
  const pendingTxs = getPendingUnsyncedTransactions();
  if (pendingTxs.length === 0) {
    return 0; // No transactions to sync
  }

  let syncedCount = 0;

  for (const tx of pendingTxs) {
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tx),
      });

      if (response.ok) {
        // Mark as synced locally
        markTransactionAsSynced(tx.id);
        syncedCount++;
        console.log(`Successfully synced tx: ${tx.id}`);
      } else {
        console.error(`Failed to sync tx: ${tx.id}. Status: ${response.status}`);
      }
    } catch (error) {
      // Gracefully catch offline network exceptions without crashing
      console.error(`Network error during sync for tx: ${tx.id} - device might be offline.`, error);
    }
  }

  return syncedCount;
}
