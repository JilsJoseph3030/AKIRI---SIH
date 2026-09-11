import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useApp } from "../lib/store";
import { theme } from "../components/ui";

export default function Ledger() {
  const lots = useApp((s) => s.lots);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {lots.map((l) => (
        <View key={l.id} style={styles.card}>
          <Text style={styles.ref}>🔗 {l.ledgerRef ?? "⏳ queued"}</Text>
          <Text style={styles.meta}>
            {l.category} · {l.weightKg} kg · ₹{l.valueInr} ·{" "}
            {l.synced ? "synced" : "offline"}
          </Text>
        </View>
      ))}
      {lots.length === 0 && <Text style={styles.meta}>📭</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  card: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 18, gap: 4 },
  ref: { color: theme.accent, fontSize: 20, fontWeight: "800" },
  meta: { color: theme.sub, fontSize: 15 },
});
