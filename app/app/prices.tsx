import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { PRICES } from "@akiri/backend/domain";
import type { PriceEntry } from "@akiri/backend/domain";
import { AudioButton, theme } from "../components/ui";
import { getDb } from "../lib/db";
import { useApp } from "../lib/store";

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

  const spoken = prices.map((p) => `${p.category} ${p.ratePerKg} rupees per kilo`).join(". ");

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <AudioButton text={spoken} lang={lang} />
      {prices.map((p) => (
        <View key={`${p.category}-${p.location}`} style={styles.row}>
          <Text style={styles.cat}>🔧 {p.category}</Text>
          <Text style={styles.rate}>₹{p.ratePerKg}/kg</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  row: {
    backgroundColor: theme.card, borderRadius: theme.radius,
    padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  cat: { color: theme.ink, fontSize: 18, fontWeight: "700" },
  rate: { color: theme.accent, fontSize: 20, fontWeight: "800" },
});
