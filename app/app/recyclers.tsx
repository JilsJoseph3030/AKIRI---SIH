import { ScrollView, StyleSheet, Text, View } from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
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
          <View style={styles.nameRow}>
            <MCIcon name="recycle" size={22} color={theme.accent} />
            <Text style={styles.name}>{r.area}</Text>
          </View>
          <View style={styles.nameRow}>
            <MCIcon name="shield-check" size={18} color={theme.accent} />
            <Text style={styles.ok}>{t("authorize")}</Text>
          </View>
          <View style={styles.nameRow}>
            <MCIcon
              name={r.pickupAvailable ? "truck" : "factory"}
              size={18}
              color={theme.sub}
            />
            <Text style={styles.meta}>
              {r.distanceKm.toFixed(1)} km · ₹{r.offeredRate}/kg
            </Text>
          </View>
        </View>
      ))}
      {ranked.length === 0 && <Text style={styles.meta}>—</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  card: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 18, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: theme.ink, fontSize: 18, fontWeight: "800", flex: 1 },
  ok: { color: theme.accent, fontSize: 15, fontWeight: "700" },
  meta: { color: theme.sub, fontSize: 15 },
});
