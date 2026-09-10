import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useI18n } from '../lib/i18n';
import { getPendingUnsyncedTransactions } from '../db/offline-sqlite';

export const CollectorDashboard = ({ navigation }: any) => {
  const { t } = useI18n();
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadPendingCount = () => {
    try {
      const pending = getPendingUnsyncedTransactions();
      setUnsyncedCount(pending.length);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    loadPendingCount();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadPendingCount();
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const MarketCard = ({ material, price, icon }: { material: string, price: string, icon: string }) => (
    <View style={styles.card}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{material}</Text>
        <Text style={styles.cardPrice}>₹{price} / kg</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Offline Sync Banner */}
      {unsyncedCount > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncText}>⚠️ {unsyncedCount} Trades Waiting for Sync</Text>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" />}
      >
        <Text style={styles.headerTitle}>Live Market Prices</Text>
        
        {/* Pictorial high-contrast cards for low-literacy users */}
        <MarketCard icon="💻" material="PCB High Grade" price="450" />
        <MarketCard icon="🔋" material="Li-Ion Battery" price="120" />
        <MarketCard icon="📺" material="CRT Glass" price="15" />
        <MarketCard icon="🔌" material="Mixed E-Waste" price="45" />

        {/* Massive primary action button */}
        <TouchableOpacity 
          style={styles.mainActionButton}
          onPress={() => navigation.navigate('ScaleIngestion')}
        >
          <Text style={styles.actionButtonText}>Start New Weighing</Text>
          <Text style={styles.actionButtonSubtext}>Connect BLE Scale</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  syncBanner: { backgroundColor: '#FF8F00', padding: 14, alignItems: 'center', elevation: 2 },
  syncText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerTitle: { color: '#888', fontSize: 18, textTransform: 'uppercase', marginBottom: 16, letterSpacing: 1, fontWeight: 'bold' },
  card: { flexDirection: 'row', backgroundColor: '#1E1E1E', padding: 18, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  cardIcon: { fontSize: 36, marginRight: 16 },
  cardContent: { flex: 1 },
  cardTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  cardPrice: { color: '#00E676', fontSize: 18, marginTop: 6, fontWeight: '800' },
  mainActionButton: { backgroundColor: '#2962FF', padding: 24, borderRadius: 16, alignItems: 'center', marginTop: 24, elevation: 5 },
  actionButtonText: { color: '#FFF', fontSize: 24, fontWeight: '900', textTransform: 'uppercase' },
  actionButtonSubtext: { color: '#BBBBBB', fontSize: 16, marginTop: 6 }
});
