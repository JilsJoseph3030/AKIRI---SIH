import { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { estimateValue, MATERIALS, PRICES } from "@akiri/backend/domain";
import type { MaterialCategory } from "@akiri/backend/domain";
import { AudioButton, strip, theme } from "../components/ui";
import type { IconName } from "../components/ui";
import { classifier } from "../lib/classifier";
import type { Classification } from "../lib/classifier";
import { getDb } from "../lib/db";
import { newId, useApp } from "../lib/store";
import { postLot } from "../lib/api";
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

export default function Snap() {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<Classification[]>([]);
  const [category, setCategory] = useState<MaterialCategory>("pcb");
  const [weight, setWeight] = useState("2.5");
  const [busy, setBusy] = useState(false);
  const lang = useApp((s) => s.language);
  const addLot = useApp((s) => s.addLot);

  if (!permission?.granted) {
    return (
      <View style={styles.wrap}>
        <Pressable style={styles.cta} onPress={requestPermission}>
          <MCIcon name="camera" size={30} color={theme.accentInk} />
          <Text style={styles.ctaText}>{t("stepPhoto")}</Text>
        </Pressable>
      </View>
    );
  }

  const weightKg = Number(weight) || 0;
  const rate = PRICES.find((p) => p.category === category)?.ratePerKg ?? 0;
  const value = estimateValue(category, weightKg, PRICES, "Nagpur");
  const top = guesses[0];
  const unsure = top !== undefined && top.confidence < 0.7;

  async function capture() {
    if (busy) return;
    setBusy(true);
    try {
      const photo = await camera.current?.takePictureAsync();
      if (!photo?.uri) return;
      setPhotoUri(photo.uri);
      const results = await classifier.classify(photo.uri);
      // Guard: a model may repeat a category (the mock returns
      // mixed_plastics twice when it is the top guess) — chip keys
      // must stay unique or React drops/duplicates children.
      const seen = new Set<MaterialCategory>();
      const unique = results.filter((r) => {
        if (seen.has(r.category)) return false;
        seen.add(r.category);
        return true;
      });
      setGuesses(unique);
      if (unique[0]) setCategory(unique[0].category);
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    setPhotoUri(null);
    setGuesses([]);
  }

  function step(delta: number) {
    const next = Math.max(0, Math.round(((Number(weight) || 0) + delta) * 2) / 2);
    setWeight(String(next));
  }

  async function save() {
    if (weightKg <= 0) return;
    const id = newId();
    const db = getDb();
    await db.runAsync(
      `INSERT INTO lots (id, category, weight_kg, value_inr, photo_uri, photo_hash, timestamp, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, category, weightKg, value, photoUri, `photo:${id}`, new Date().toISOString()],
    );
    let ledgerRef: string | null = null;
    let synced = false;
    try {
      ({ ledgerRef } = await postLot({
        id, collectorId: "col-device", category, weightKg, photoHash: `photo:${id}`,
      }));
      synced = true;
      await db.runAsync(`UPDATE lots SET synced = 1, ledger_ref = ? WHERE id = ?`, [ledgerRef, id]);
    } catch {
      synced = false; // offline: stays queued, flushes on reconnect
    }
    addLot({ id, photoUri, category, weightKg, valueInr: value, ledgerRef, synced });
    retake();
    router.push("/ledger");
  }

  // Step 1: capture
  if (!photoUri) {
    return (
      <View style={styles.wrap}>
        <CameraView ref={camera} style={styles.cam} facing="back" />
        <Pressable
          style={[styles.cta, busy && styles.disabled]}
          onPress={capture}
          disabled={busy}
        >
          <MCIcon name="camera" size={30} color={theme.accentInk} />
          <Text style={styles.ctaText}>{t("stepPhoto")}</Text>
        </Pressable>
      </View>
    );
  }

  // Step 2: verify + weigh + save
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
      <Pressable style={styles.retake} onPress={retake}>
        <MCIcon name="camera-retake" size={20} color={theme.accent} />
        <Text style={styles.retakeText}>{t("retake")}</Text>
      </Pressable>

      {unsure && <Text style={styles.nudge}>{t("checkItem")}</Text>}
      {guesses.length > 0 && (
        <View style={styles.chipRow}>
          {guesses.map((g) => {
            const selected = g.category === category;
            return (
              <Pressable
                key={g.category}
                style={[styles.guess, selected && styles.guessActive]}
                onPress={() => setCategory(g.category)}
              >
                <Text style={[styles.guessText, selected && styles.guessTextActive]}>
                  {labelFor(g.category, lang)} · {Math.round(g.confidence * 100)}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.grid}>
        {MATERIALS.map((m) => {
          const selected = m.category === category;
          const color = strip[m.category] ?? theme.accent;
          return (
            <Pressable
              key={m.category}
              style={[styles.cat, selected && { borderColor: color, borderWidth: 2 }]}
              onPress={() => setCategory(m.category)}
            >
              <MCIcon name={CAT_ICON[m.category] ?? "tag"} size={26} color={color} />
              <Text style={styles.catText} numberOfLines={2}>
                {m.label[lang]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>{t("weight")}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          style={styles.stepBtn}
          onPress={() => step(-0.5)}
        >
          <MCIcon name="minus" size={28} color={theme.ink} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />
        <Pressable
          accessibilityRole="button"
          style={styles.stepBtn}
          onPress={() => step(0.5)}
        >
          <MCIcon name="plus" size={28} color={theme.ink} />
        </Pressable>
      </View>

      <View style={styles.estimate}>
        <Text style={styles.estCat}>{labelFor(category, lang)}</Text>
        <Text style={styles.estRate}>
          ₹{rate}/kg · {weightKg} kg
        </Text>
        <Text style={styles.estTotal}>₹{value}</Text>
      </View>
      <AudioButton
        text={`${labelFor(category, lang)}, ${weight} kilo, ${value} rupees`}
        lang={lang}
      />
      <Pressable
        style={[styles.save, weightKg <= 0 && styles.disabled]}
        onPress={save}
        disabled={weightKg <= 0}
      >
        <View style={styles.saveRow}>
          <Text style={styles.saveText}>
            {t("saveLot")} · ₹{value}
          </Text>
          <MCIcon name="content-save" size={22} color={theme.accentInk} />
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 20, gap: 14 },
  cam: { flex: 1, minHeight: 340, borderRadius: theme.radiusLg, overflow: "hidden" },
  cta: {
    backgroundColor: theme.accent,
    borderRadius: 20,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: { color: theme.accentInk, fontSize: 22, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  preview: { height: 220, borderRadius: theme.radiusLg, backgroundColor: "#E2E8F0" },
  retake: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  retakeText: { color: theme.accent, fontSize: 17, fontWeight: "700" },
  nudge: { color: theme.ink, fontSize: 18, fontWeight: "800" },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  guess: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  guessActive: { borderColor: theme.accent, borderWidth: 2 },
  guessText: { color: theme.sub, fontSize: 16, fontWeight: "700" },
  guessTextActive: { color: theme.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cat: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: theme.radius,
    padding: 12,
    width: "31%",
    alignItems: "center",
    gap: 6,
  },
  catText: { color: theme.ink, fontSize: 13, fontWeight: "700", textAlign: "center" },
  label: { color: theme.sub, fontSize: 15 },
  stepper: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  stepBtn: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: theme.radius,
    width: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    color: theme.ink,
    fontSize: 28,
    fontWeight: "800",
    borderRadius: theme.radius,
    padding: 14,
    textAlign: "center",
  },
  estimate: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: theme.radiusLg,
    padding: 24,
    gap: 2,
    alignItems: "center",
  },
  estCat: { color: theme.sub, fontSize: 17, fontWeight: "700" },
  estRate: { color: theme.sub, fontSize: 16 },
  estTotal: { color: theme.accent, fontSize: 44, fontWeight: "800" },
  save: { backgroundColor: theme.accent, borderRadius: 20, padding: 20, alignItems: "center" },
  saveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveText: { color: theme.accentInk, fontSize: 20, fontWeight: "800" },
});
