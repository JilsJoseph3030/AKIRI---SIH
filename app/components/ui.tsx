import { useState, type ComponentProps, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
import * as Speech from "expo-speech";
import { useTranslation } from "react-i18next";
import { ttsLocale, type AppLanguage } from "../lib/i18n";

/** Vector-icon name type for category maps and shared icon props. */
export type IconName = ComponentProps<typeof MCIcon>["name"];

export const theme = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  line: "#E2E8F0",
  ink: "#0F172A",
  sub: "#64748B",
  accent: "#2563EB",
  accentInk: "#FFFFFF",
  warn: "#F59E0B",
  danger: "#EF4444",
  success: "#059669",
  radius: 14,
  radiusLg: 28,
};

/** Left-strip / icon colors per material category (draft's color-coded rates). */
export const strip: Record<string, string> = {
  pcb: "#8B5CF6",
  cable: "#2563EB",
  battery: "#EF4444",
  motor_magnet: "#F59E0B",
  lcd_panel: "#0EA5E9",
  crt: "#64748B",
  mixed_plastics: "#10B981",
};

export const tint = {
  dangerBg: "#FEF2F2",
  dangerBd: "#FECACA",
  dangerInk: "#991B1B",
  okBg: "#ECFDF5",
  okBd: "#A7F3D0",
  okInk: "#065F46",
  infoBg: "#DBEAFE",
  infoInk: "#1D4ED8",
  warnBg: "#FFFBEB",
  warnInk: "#B45309",
};

export function AudioButton({ text, lang }: { text: string; lang: AppLanguage }) {
  const { t } = useTranslation();
  const [speaking, setSpeaking] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("listen")}
      style={[styles.audio, styles.audioRow]}
      onPress={() => {
        if (speaking) {
          Speech.stop();
          setSpeaking(false);
        } else {
          Speech.stop();
          setSpeaking(true);
          Speech.speak(text, { 
            language: ttsLocale[lang],
            onDone: () => setSpeaking(false),
            onStopped: () => setSpeaking(false),
            onError: () => setSpeaking(false),
          });
        }
      }}
    >
      <MCIcon name={speaking ? "stop" : "volume-high"} size={20} color={tint.infoInk} />
      <Text style={styles.audioText}>{t("listen")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  audio: {
    backgroundColor: tint.infoBg,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  audioText: { color: tint.infoInk, fontSize: 16, fontWeight: "700" },
  audioRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  /** 64px round TTS button for rate/safety cards (draft's speaker buttons). */
  dot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tint.infoBg,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: theme.ink, fontSize: 24, fontWeight: "800" },
  sectionAction: { color: theme.accent, fontSize: 17, fontWeight: "700" },
});

/** Large round text-to-speech button (min 64px target, low-literacy friendly). */
export function SpeakDot({ text, lang }: { text: string; lang: AppLanguage }) {
  const { t } = useTranslation();
  const [speaking, setSpeaking] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("listen")}
      style={styles.dot}
      onPress={() => {
        if (speaking) {
          Speech.stop();
          setSpeaking(false);
        } else {
          Speech.stop();
          setSpeaking(true);
          Speech.speak(text, { 
            language: ttsLocale[lang],
            onDone: () => setSpeaking(false),
            onStopped: () => setSpeaking(false),
            onError: () => setSpeaking(false),
          });
        }
      }}
    >
      <MCIcon name={speaking ? "stop" : "volume-high"} size={30} color={tint.infoInk} />
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
