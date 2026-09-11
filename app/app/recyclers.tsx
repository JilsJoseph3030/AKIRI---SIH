import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { rankRecyclers, RECYCLERS } from "@akiri/backend/domain";
import { theme } from "../components/ui";

export default function Recyclers() {
  const { t } = useTranslation();
  // Field GPS would come from expo-location; demo anchor: Nagpur centre.
  const ranked = rankRecyclers(RECYCLERS, "pcb", 21.15, 79.09);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {ranked.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.name}>♻️ {r.area}</Text>
          <Text style={styles.ok}>✅ {t("authorize")}</Text>
          <Text style={styles.meta}>
            {r.distanceKm.toFixed(1)} km · ₹{r.offeredRate}/kg ·{" "}
            {r.pickupAvailable ? "🛻" : "🏭"}
          </Text>
        </View>
      ))}
      {ranked.length === 0 && <Text style={styles.meta}>—</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  card: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 18, gap: 4 },
  name: { color: theme.ink, fontSize: 18, fontWeight: "800" },
  ok: { color: theme.accent, fontSize: 15, fontWeight: "700" },
  meta: { color: theme.sub, fontSize: 15 },
});
