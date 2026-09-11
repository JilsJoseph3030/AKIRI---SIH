import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useApp } from "../lib/store";
import { theme } from "../components/ui";

export default function Earnings() {
  const { t } = useTranslation();
  const lots = useApp((s) => s.lots);
  const confirmed = lots.filter((l) => l.synced);
  const pending = lots.filter((l) => !l.synced);
  const sum = (xs: typeof lots) => xs.reduce((n, l) => n + l.valueInr, 0);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <View style={styles.big}>
        <Text style={styles.bigNum}>₹{sum(confirmed)}</Text>
        <Text style={styles.cap}>{t("total")}</Text>
      </View>
      <View style={styles.big}>
        <Text style={styles.bigNum}>₹{sum(pending)}</Text>
        <Text style={styles.cap}>{t("pending")}</Text>
      </View>
      <Text style={styles.head}>{t("history")}</Text>
      {lots.map((l) => (
        <View key={l.id} style={styles.row}>
          <Text style={styles.rowText}>💵 {l.category} · {l.weightKg} kg</Text>
          <Text style={styles.rowNum}>₹{l.valueInr}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  big: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 22, alignItems: "center" },
  bigNum: { color: theme.accent, fontSize: 40, fontWeight: "800" },
  cap: { color: theme.sub, fontSize: 15 },
  head: { color: theme.ink, fontSize: 18, fontWeight: "800", marginTop: 8 },
  row: {
    backgroundColor: theme.card, borderRadius: theme.radius, padding: 16,
    flexDirection: "row", justifyContent: "space-between",
  },
  rowText: { color: theme.ink, fontSize: 16 },
  rowNum: { color: theme.ink, fontSize: 16, fontWeight: "800" },
});
