import { ScrollView, StyleSheet, Text, View } from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
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
      <View style={styles.hero}>
        <Text style={styles.cap}>{t("todayEarn")}</Text>
        <Text style={styles.bigNum}>₹{sum(confirmed)}</Text>
        <View style={styles.split}>
          <View>
            <Text style={styles.capSm}>{t("pending")}</Text>
            <Text style={styles.splitNum}>₹{sum(pending)}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.capSm}>{t("total")}</Text>
            <Text style={styles.splitNum}>₹{sum(confirmed) + sum(pending)}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.head}>{t("history")}</Text>
      {lots.map((l) => (
        <View key={l.id} style={styles.row}>
          <View style={styles.rowLeft}>
            <MCIcon name="currency-inr" size={18} color={theme.sub} />
            <Text style={styles.rowText}>{l.category} · {l.weightKg} kg</Text>
          </View>
          <Text style={styles.rowNum}>₹{l.valueInr}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  hero: {
    backgroundColor: "#0F172A",
    borderRadius: 32,
    padding: 32,
    gap: 6,
  },
  cap: { color: "#94A3B8", fontSize: 18, fontWeight: "700" },
  bigNum: { color: "#FFFFFF", fontSize: 56, fontWeight: "800" },
  split: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  capSm: { color: "#94A3B8", fontSize: 14, fontWeight: "700" },
  splitNum: { color: "#E2E8F0", fontSize: 24, fontWeight: "800" },
  right: { alignItems: "flex-end" },
  head: { color: theme.ink, fontSize: 22, fontWeight: "800", marginTop: 8 },
  row: {
    backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1,
    borderRadius: theme.radius, padding: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  rowText: { color: theme.ink, fontSize: 16 },
  rowNum: { color: theme.ink, fontSize: 16, fontWeight: "800" },
});
