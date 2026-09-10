import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface UnitEconomicsProps {
  material: string;
  weightKg: number;
}

export const UnitEconomicsCard: React.FC<UnitEconomicsProps> = ({ material, weightKg }) => {
  // Simulated Economic Parameters: Informal unorganized middlemen vs Akiri Direct Recyclers
  const rates = {
    PCB_HIGH_GRADE: { informal: 320, akiri: 450 },
    LI_ION_BATTERY: { informal: 80, akiri: 120 },
    CRT_GLASS: { informal: 10, akiri: 15 },
    MIXED_EWASTE: { informal: 30, akiri: 45 },
  };

  const selectedRates = rates[material as keyof typeof rates] || rates.MIXED_EWASTE;
  
  const informalTotal = selectedRates.informal * weightKg;
  const akiriTotal = selectedRates.akiri * weightKg;
  
  const marginIncrease = akiriTotal - informalTotal;
  const percentageIncrease = ((marginIncrease / informalTotal) * 100).toFixed(1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Unit Economics Impact</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Traditional Middleman Payout:</Text>
        <Text style={styles.informalValue}>₹{informalTotal.toFixed(2)}</Text>
      </View>
      
      <View style={styles.row}>
        <Text style={styles.label}>Akiri Direct Recycler Payout:</Text>
        <Text style={styles.akiriValue}>₹{akiriTotal.toFixed(2)}</Text>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.highlightBox}>
        <Text style={styles.highlightText}>
          Waste Picker Profit Increase: <Text style={styles.boldText}>+₹{marginIncrease.toFixed(2)}</Text>
        </Text>
        <Text style={styles.percentageText}>({percentageIncrease}% Higher Payout)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#1E1E1E', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginVertical: 10 },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  label: { color: '#AAA', fontSize: 16, flex: 1 },
  informalValue: { color: '#FF5252', fontSize: 18, fontWeight: 'bold' },
  akiriValue: { color: '#00E676', fontSize: 18, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 12 },
  highlightBox: { backgroundColor: '#1B5E20', padding: 14, borderRadius: 8, alignItems: 'center' },
  highlightText: { color: '#FFF', fontSize: 16 },
  boldText: { fontWeight: '900', fontSize: 22, color: '#FFF' },
  percentageText: { color: '#A5D6A7', fontSize: 14, marginTop: 4, fontWeight: 'bold' }
});
