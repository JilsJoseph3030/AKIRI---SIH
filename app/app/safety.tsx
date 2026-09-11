import { ScrollView, StyleSheet, Text, View } from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { AudioButton, theme, tint } from "../components/ui";
import type { IconName } from "../components/ui";
import { useApp } from "../lib/store";

const CARDS: { icon: IconName; en: string; hi: string; mr: string }[] = [
  { icon: "battery-alert", en: "Batteries: tape the ends, keep away from heat. Never puncture.", hi: "बैटरी: सिरों पर टेप लगाएं, गर्मी से दूर रखें। कभी छेद न करें।", mr: "बॅटरी: टोकांना टेप लावा, उष्णतेपासून दूर ठेवा. कधीही छेद पाडू नका." },
  { icon: "television", en: "CRT screens: leaded glass inside. Do not break the tube.", hi: "सीआरटी स्क्रीन: अंदर सीसा-कांच। ट्यूब कभी न तोड़ें।", mr: "सीआरटी स्क्रीन: आत शिसे-काच. नळी कधीही फोडू नका." },
  { icon: "fire", en: "Never burn wire or boards to recover metal. Poisonous smoke.", hi: "धातु के लिए तार या बोर्ड कभी न जलाएं। जहरीला धुआं।", mr: "धातूसाठी तारा किंवा बोर्ड कधीही जाळू नका. विषारी धूर." },
  { icon: "shield-check", en: "Wear gloves and wash hands after handling scrap.", hi: "दस्ताने पहनें और कबाड़ छूने के बाद हाथ धोएं।", mr: "हातमोजे घाला आणि भंगार हाताळल्यावर हात धुवा." },
];

export default function Safety() {
  const { t } = useTranslation();
  const lang = useApp((s) => s.language);

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.head}>{t("safetyHeed")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {CARDS.map((card, i) => {
          const ok = i === CARDS.length - 1;
          return (
            <View
              key={card.en}
              style={[
                styles.card,
                ok
                  ? { backgroundColor: tint.okBg, borderColor: tint.okBd }
                  : { backgroundColor: tint.dangerBg, borderColor: tint.dangerBd },
              ]}
            >
              <MCIcon
                name={card.icon}
                size={64}
                color={ok ? theme.accent : theme.danger}
              />
              <Text style={styles.text}>{card[lang]}</Text>
              <AudioButton text={card[lang]} lang={lang} />
            </View>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  head: { color: theme.ink, fontSize: 26, fontWeight: "800" },
  rail: { gap: 16, paddingRight: 20 },  card: {
    width: 250,
    borderWidth: 2,
    borderRadius: theme.radiusLg,
    padding: 24,
    alignItems: "center",
    gap: 14,
  },
  text: { color: theme.ink, fontSize: 19, textAlign: "center", lineHeight: 28 },
});
