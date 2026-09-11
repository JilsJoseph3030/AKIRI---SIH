import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AudioButton, theme } from "../components/ui";
import { useApp } from "../lib/store";

const CARDS = [
  { icon: "🔋", en: "Batteries: tape the ends, keep away from heat. Never puncture.", hi: "बैटरी: सिरों पर टेप लगाएं, गर्मी से दूर रखें। कभी छेद न करें।", mr: "बॅटरी: टोकांना टेप लावा, उष्णतेपासून दूर ठेवा. कधीही छेद पाडू नका." },
  { icon: "📺", en: "CRT screens: leaded glass inside. Do not break the tube.", hi: "सीआरटी स्क्रीन: अंदर सीसा-कांच। ट्यूब कभी न तोड़ें।", mr: "सीआरटी स्क्रीन: आत शिसे-काच. नळी कधीही फोडू नका." },
  { icon: "🔥", en: "Never burn wire or boards to recover metal. Poisonous smoke.", hi: "धातु के लिए तार या बोर्ड कभी न जलाएं। जहरीला धुआं।", mr: "धातूसाठी तारा किंवा बोर्ड कधीही जाळू नका. विषारी धूर." },
  { icon: "🧤", en: "Wear gloves and wash hands after handling scrap.", hi: "दस्ताने पहनें और कबाड़ छूने के बाद हाथ धोएं।", mr: "हातमोजे घाला आणि भंगार हाताळल्यावर हात धुवा." },
] as const;

export default function Safety() {
  const lang = useApp((s) => s.language);
  const [i, setI] = useState(0);
  const card = CARDS[i % CARDS.length]!;

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.icon}>{card.icon}</Text>
        <Text style={styles.text}>{card[lang]}</Text>
      </View>
      <AudioButton text={card[lang]} lang={lang} />
      <View style={styles.nav}>
        <Pressable style={styles.btn} onPress={() => setI((v) => (v + CARDS.length - 1) % CARDS.length)}>
          <Text style={styles.btnText}>◀</Text>
        </Pressable>
        <Text style={styles.count}>{(i % CARDS.length) + 1}/{CARDS.length}</Text>
        <Pressable style={styles.btn} onPress={() => setI((v) => (v + 1) % CARDS.length)}>
          <Text style={styles.btnText}>▶</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 14, justifyContent: "center" },
  card: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 28, alignItems: "center", gap: 12 },
  icon: { fontSize: 72 },
  text: { color: theme.ink, fontSize: 20, textAlign: "center", lineHeight: 30 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  btn: { backgroundColor: theme.card, borderRadius: 999, width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  btnText: { color: theme.ink, fontSize: 24 },
  count: { color: theme.sub, fontSize: 16 },
});
