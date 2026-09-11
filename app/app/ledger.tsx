import { ScrollView, StyleSheet, Text, View } from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useApp } from "../lib/store";
import { theme } from "../components/ui";

export default function Ledger() {
  const lots = useApp((s) => s.lots);
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {lots.map((l) => (
        <View key={l.id} style={styles.card}>
          <View style={styles.refRow}>
            <MCIcon
              name={l.ledgerRef ? "link-variant" : "clock-outline"}
              size={22}
              color={theme.accent}
            />
            <Text style={styles.ref}>{l.ledgerRef ?? "queued"}</Text>
          </View>
          <Text style={styles.meta}>
            {l.category} · {l.weightKg} kg · ₹{l.valueInr} ·{" "}
            {l.synced ? "synced" : "offline"}
          </Text>
        </View>
      ))}
      {lots.length === 0 && (
        <View style={styles.empty}>
          <MCIcon name="inbox-outline" size={48} color={theme.sub} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  card: { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: theme.radius, padding: 18, gap: 4 },
  refRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ref: { color: theme.accent, fontSize: 20, fontWeight: "800", flex: 1 },
  meta: { color: theme.sub, fontSize: 15 },
  empty: { alignItems: "center", padding: 32 },
});
