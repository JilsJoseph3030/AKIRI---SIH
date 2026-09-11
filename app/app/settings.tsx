import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import i18n, { type AppLanguage } from "../lib/i18n";
import { useApp } from "../lib/store";
import { theme, tint } from "../components/ui";

const LANGS: { code: AppLanguage; label: string }[] = [
  { code: "mr", label: "मराठी" },
  { code: "hi", label: "हिंदी" },
  { code: "en", label: "English" },
];

export default function Settings() {
  const { t } = useTranslation();
  const language = useApp((s) => s.language);
  const setLanguage = useApp((s) => s.setLanguage);
  const digital = useApp((s) => s.digitalPayments);
  const setDigital = useApp((s) => s.setDigital);

  return (
    <View style={styles.wrap}>
      <Text style={styles.head}>{t("language")}</Text>
      <View style={styles.row}>
        {LANGS.map((l) => (
          <Pressable
            key={l.code}
            style={[styles.lang, language === l.code && styles.active]}
            onPress={() => {
              setLanguage(l.code);
              i18n.changeLanguage(l.code);
            }}
          >
            <Text style={styles.langText}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.cash}>
        <View style={styles.cashRow}>
          <MCIcon name="currency-inr" size={20} color={tint.okInk} />
          <Text style={styles.cashText}>{t("cashDefault")}</Text>
        </View>
      </View>
      <View style={styles.toggle}>
        <Text style={styles.toggleText}>{t("digitalToggle")}</Text>
        <Switch value={digital} onValueChange={setDigital} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 14 },
  head: { color: theme.ink, fontSize: 20, fontWeight: "800" },
  row: { flexDirection: "row", gap: 10 },
  lang: { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: theme.radius, padding: 16, flex: 1, alignItems: "center" },
  active: { borderColor: theme.accent, borderWidth: 2 },
  langText: { color: theme.ink, fontSize: 17, fontWeight: "700" },
  cash: { backgroundColor: tint.okBg, borderColor: tint.okBd, borderWidth: 1, borderRadius: theme.radius, padding: 18 },
  cashRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cashText: { color: tint.okInk, fontSize: 17, fontWeight: "700" },
  toggle: {
    backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: theme.radius, padding: 18,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  toggleText: { color: theme.ink, fontSize: 16, flex: 1 },
});
