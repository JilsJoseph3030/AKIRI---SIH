import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "../components/ui";
import { useApp } from "../lib/store";

const TILES = [
  { href: "/snap", icon: "📸", key: "snap" },
  { href: "/prices", icon: "💰", key: "prices" },
  { href: "/recyclers", icon: "♻️", key: "recyclers" },
  { href: "/ledger", icon: "🔗", key: "ledger" },
  { href: "/earnings", icon: "💵", key: "earnings" },
  { href: "/safety", icon: "⚠️", key: "safety" },
  { href: "/settings", icon: "⚙️", key: "settings" },
] as const;

export default function Home() {
  const { t } = useTranslation();
  const online = useApp((s) => s.online);
  const pending = useApp((s) => s.lots.filter((l) => !l.synced).length);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.brand}>Akiri</Text>
      <Text style={styles.net}>
        {online ? `🟢 ${t("online")}` : `🔴 ${t("offline")}`}
        {pending > 0 ? ` · ⏳${pending}` : ""}
      </Text>
      <View style={styles.grid}>
        {TILES.map((tile) => (
          <Link key={tile.href} href={tile.href} asChild>
            <Pressable style={styles.tile}>
              <Text style={styles.icon}>{tile.icon}</Text>
              <Text style={styles.label}>{t(tile.key)}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 12 },
  brand: { color: theme.ink, fontSize: 40, fontWeight: "800" },
  net: { color: theme.sub, fontSize: 15 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    width: "47%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  icon: { fontSize: 44 },
  label: { color: theme.ink, fontSize: 17, fontWeight: "700" },
});
