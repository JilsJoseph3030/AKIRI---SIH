import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { MATERIALS, PRICES } from "@akiri/backend/domain";
import type { PriceEntry } from "@akiri/backend/domain";
import { AudioButton, SpeakDot, strip, theme } from "../components/ui";
import type { IconName } from "../components/ui";
import { getDb } from "../lib/db";
import { useApp } from "../lib/store";
import type { AppLanguage } from "../lib/i18n";

const CAT_ICON: Record<string, IconName> = {
  pcb: "chip",
  cable: "power-plug",
  battery: "battery-alert",
  motor_magnet: "magnet",
  lcd_panel: "television",
  crt: "monitor",
  mixed_plastics: "recycle",
};

function labelFor(category: string, lang: AppLanguage): string {
  return MATERIALS.find((m) => m.category === category)?.label[lang] ?? category;
}

export default function Prices() {
  const { t } = useTranslation();
  const lang = useApp((s) => s.language);
  const [prices, setPrices] = useState<PriceEntry[]>(PRICES);

  useEffect(() => {
    getDb()
      .getAllAsync<PriceEntry>(`SELECT category, location, rate_per_kg as ratePerKg, updated_at as updatedAt FROM prices`)
      .then((rows) => {
        if (rows.length > 0) setPrices(rows);
        else {
          const db = getDb();
          for (const p of PRICES) {
            db.runAsync(
              `INSERT OR REPLACE INTO prices (category, location, rate_per_kg, updated_at) VALUES (?, ?, ?, ?)`,
              [p.category, p.location, p.ratePerKg, p.updatedAt],
            );
          }
        }
      })
      .catch(() => setPrices(PRICES));
  }, []);

  const spoken = prices
    .map((p) => `${labelFor(p.category, lang)} ${p.ratePerKg} rupees per kilo`)
    .join(". ");

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.head}>{t("todayRates")}</Text>
      <AudioButton text={spoken} lang={lang} />
      {prices.map((p) => (
        <View
          key={`${p.category}-${p.location}`}
          style={[styles.card, { borderLeftColor: strip[p.category] ?? theme.accent }]}
        >
          <View style={styles.left}>
            <View style={styles.catRow}>
              <MCIcon
                name={CAT_ICON[p.category] ?? "tag"}
                size={28}
                color={strip[p.category] ?? theme.accent}
              />
              <Text style={styles.cat}>{labelFor(p.category, lang)}</Text>
            </View>
            <Text style={styles.rate}>
              ₹{p.ratePerKg}
              <Text style={styles.unit}>/kg</Text>
            </Text>
          </View>
          <SpeakDot
            text={`${labelFor(p.category, lang)}, ${p.ratePerKg} rupees per kilo`}
            lang={lang}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  head: { color: theme.ink, fontSize: 26, fontWeight: "800" },
  card: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: theme.radiusLg,
    borderLeftWidth: 12,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { gap: 6, flex: 1 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cat: { color: theme.ink, fontSize: 22, fontWeight: "800", flex: 1 },
  rate: { color: theme.ink, fontSize: 36, fontWeight: "800" },
  unit: { color: theme.sub, fontSize: 18, fontWeight: "400" },
});
