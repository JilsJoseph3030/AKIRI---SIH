import { useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTranslation } from "react-i18next";
import { estimateValue, PRICES } from "@akiri/backend/domain";
import type { MaterialCategory } from "@akiri/backend/domain";
import { AudioButton, theme } from "../components/ui";
import { classifier } from "../lib/classifier";
import { getDb } from "../lib/db";
import { newId, useApp } from "../lib/store";
import { postLot } from "../lib/api";

export default function Snap() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [category, setCategory] = useState<MaterialCategory>("pcb");
  const [weight, setWeight] = useState("2.5");
  const addLot = useApp((s) => s.addLot);

  if (!permission?.granted) {
    return (
      <View style={styles.wrap}>
        <Pressable style={styles.big} onPress={requestPermission}>
          <MCIcon name="camera" size={36} color={theme.ink} />
        </Pressable>
      </View>
    );
  }

  const weightKg = Number(weight) || 0;
  const value = estimateValue(category, weightKg, PRICES, "Nagpur");

  async function capture() {
    const photo = await camera.current?.takePictureAsync();
    if (!photo?.uri) return;
    setPhotoUri(photo.uri);
    const [top] = await classifier.classify(photo.uri);
    if (top) setCategory(top.category);
  }

  async function save() {
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
    setPhotoUri(null);
  }

  return (
    <View style={styles.wrap}>
      {!photoUri ? (
        <CameraView ref={camera} style={styles.cam} facing="back" />
      ) : (
        <View style={styles.cam}>
          <MCIcon name="image" size={48} color={theme.sub} />
        </View>
      )}
      <Pressable style={styles.big} onPress={photoUri ? () => setPhotoUri(null) : capture}>
        <MCIcon
          name={photoUri ? "camera-retake" : "camera"}
          size={36}
          color={theme.ink}
        />
      </Pressable>
      <Text style={styles.cat}>{category} · ₹{value}</Text>
      <Text style={styles.label}>{t("weight")}</Text>
      <TextInput
        style={styles.input}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
      />
      <AudioButton text={`${category}, ${weight} kilo, ${value} rupees`} lang={useApp.getState().language} />
      <Pressable style={styles.save} onPress={save}>
        <View style={styles.saveRow}>
          <Text style={styles.saveText}>{t("value")}: ₹{value}</Text>
          <MCIcon name="content-save" size={22} color={theme.accentInk} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 12 },
  cam: { height: 280, borderRadius: theme.radius, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  big: { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: 999, width: 84, height: 84, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  cat: { color: theme.accent, fontSize: 20, fontWeight: "800" },
  label: { color: theme.sub, fontSize: 15 },
  input: { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, color: theme.ink, fontSize: 28, borderRadius: theme.radius, padding: 14 },
  save: { backgroundColor: theme.accent, borderRadius: theme.radius, padding: 18, alignItems: "center" },
  saveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveText: { color: theme.accentInk, fontSize: 19, fontWeight: "800" },
});
