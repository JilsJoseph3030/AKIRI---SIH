import { Pressable, StyleSheet, Text } from "react-native";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { ttsLocale, type AppLanguage } from "../lib/i18n";

export const theme = {
  bg: "#101613",
  card: "#1B241E",
  ink: "#F2F5F0",
  sub: "#A9B8AC",
  accent: "#7BD88F",
  warn: "#F2B134",
  danger: "#E4572E",
  radius: 14,
};

export function AudioButton({ text, lang }: { text: string; lang: AppLanguage }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("listen")}
      style={styles.audio}
      onPress={() => Speech.speak(text, { language: ttsLocale[lang] })}
    >
      <Text style={styles.audioText}>🔊 {t("listen")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  audio: {
    backgroundColor: "#24402C",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  audioText: { color: "#F2F5F0", fontSize: 16, fontWeight: "700" },
});
