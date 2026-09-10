import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { getAllTransactions, LocalTransaction } from '../db/offline-sqlite';
import { useI18n } from '../lib/i18n';

const getMaterialIcon = (category: string) => {
  switch (category) {
    case 'PCB_HIGH_GRADE': return '💻';
    case 'LI_ION_BATTERY': return '🔋';
    case 'CRT_GLASS': return '📺';
    default: return '🔌';
  }
};

export const EarningsLedger = () => {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLedger = () => {
    try {
      const data = getAllTransactions();
      setTransactions(data);
    } catch (e) {
      console.log("Error loading ledger", e);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadLedger();
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const renderItem = ({ item }: { item: LocalTransaction }) => {
    const date = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown Date';
    return (
      <View style={styles.ledgerCard}>
        <Text style={styles.materialIcon}>{getMaterialIcon(item.material_category)}</Text>
        
        <View style={styles.ledgerDetails}>
          <Text style={styles.dateText}>{date}</Text>
          <Text style={styles.weightText}>{item.raw_weight_kg.toFixed(2)} kg</Text>
          
          <View style={styles.tagRow}>
            {/* Cash Tag */}
            <View style={styles.cashTag}>
              <Text style={styles.cashTagText}>💵 Cash</Text>
            </View>
            
            {/* Sync Status Tag */}
            <View style={[styles.syncTag, item.synced ? styles.synced : styles.cached]}>
              <Text style={styles.syncTagText}>{item.synced ? 'Synced' : 'Cached'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.payoutContainer}>
          <Text style={styles.payoutAmount}>₹{item.final_payout_amt?.toFixed(0) || '0'}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Earnings Ledger</Text>
      
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" />}
        ListEmptyComponent={<Text style={styles.emptyText}>No trades found.</Text>}
        // Memory optimization for low-end devices
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', padding: 20, paddingBottom: 10 },
  listContent: { padding: 16, paddingBottom: 40 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 16 },
  ledgerCard: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  materialIcon: { fontSize: 32, marginRight: 16 },
  ledgerDetails: { flex: 1 },
  dateText: { color: '#888', fontSize: 14, marginBottom: 4 },
  weightText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  tagRow: { flexDirection: 'row', gap: 8 },
  cashTag: { backgroundColor: '#2E7D32', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  cashTagText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  syncTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  synced: { backgroundColor: '#1565C0' }, // Blue for synced
  cached: { backgroundColor: '#E65100' }, // Orange for cached
  syncTagText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  payoutContainer: { alignItems: 'flex-end', justifyContent: 'center' },
  payoutAmount: { color: '#00E676', fontSize: 24, fontWeight: '900' }
});
