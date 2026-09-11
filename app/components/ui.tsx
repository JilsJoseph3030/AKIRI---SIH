import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { ttsLocale, type AppLanguage } from "../lib/i18n";

/** Vector-icon name type for category maps and shared icon props. */
export type IconName = ComponentProps<typeof MCIcon>["name"];

export const theme = {
  bg: "#101613",
  card: "#1B241E",
  ink: "#F2F5F0",
  sub: "#A9B8AC",
  accent: "#7BD88F",
  warn: "#F2B134",
  danger: "#E4572E",
  radius: 14,
  radiusLg: 28,
};

/** Left-strip / icon colors per material category (draft's color-coded rates). */
export const strip: Record<string, string> = {
  pcb: "#B388FF",
  cable: "#5B9CFF",
  battery: "#E4572E",
  motor_magnet: "#F2B134",
  lcd_panel: "#4FD1C5",
  crt: "#94A3B8",
  mixed_plastics: "#7BD88F",
};

export const tint = {
  dangerBg: "#2A1A14",
  dangerBd: "#5A2E1E",
  okBg: "#14241A",
  okBd: "#2C4A34",
};

export function AudioButton({ text, lang }: { text: string; lang: AppLanguage }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("listen")}
      style={[styles.audio, styles.audioRow]}
      onPress={() => Speech.speak(text, { language: ttsLocale[lang] })}
    >
      <MCIcon name="volume-high" size={20} color="#F2F5F0" />
      <Text style={styles.audioText}>{t("listen")}</Text>
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
  audioRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  /** 64px round TTS button for rate/safety cards (draft's speaker buttons). */
  dot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#24402C",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: "#F2F5F0", fontSize: 24, fontWeight: "800" },
  sectionAction: { color: "#7BD88F", fontSize: 17, fontWeight: "700" },
});

/** Large round text-to-speech button (min 64px target, low-literacy friendly). */
export function SpeakDot({ text, lang }: { text: string; lang: AppLanguage }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("listen")}
      style={styles.dot}
      onPress={() => Speech.speak(text, { language: ttsLocale[lang] })}
    >
      <MCIcon name="volume-high" size={30} color="#F2F5F0" />
    </Pressable>
  );
}

/** Section header row: big title left, optional action right. */
export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}
