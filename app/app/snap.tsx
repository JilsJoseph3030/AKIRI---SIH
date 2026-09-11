import { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
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
import { identifyScan, postLot } from "../lib/api";
import type { ScanResult } from "../lib/api";
import CenterMap from "../components/CenterMap";

export default function Snap() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [category, setCategory] = useState<MaterialCategory>("pcb");
  const [weight, setWeight] = useState("2.5");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
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

  async function uriToBase64(uri: string): Promise<string | null> {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      // Executor form: FileReader is event-based with no promise API,
      // and the app targets ES2022 lib (no Promise.withResolvers).
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(blob);
      });
      return dataUrl.split(",")[1] ?? null;
    } catch {
      return null;
    }
  }

  async function capture() {
    const photo = await camera.current?.takePictureAsync({ base64: true, quality: 0.6 });
    if (!photo?.uri) return;
    setPhotoUri(photo.uri);
    setScan(null);
    // On-device mock first (instant, offline); backend vision refines when online.
    const [top] = await classifier.classify(photo.uri);
    if (top) setCategory(top.category);
    const sid = newId();
    setScanId(sid);
    setScanning(true);
    try {
      const b64 = photo.base64 ?? (await uriToBase64(photo.uri));
      if (b64) {
        const result = await identifyScan({
          id: sid,
          collectorId: "col-device",
          imageBase64: b64,
          weightKg: Number(weight) || 0,
        });
        if (result) {
          setScan(result);
          setCategory(result.category as MaterialCategory);
        }
      }
    } finally {
      setScanning(false);
    }
  }

  const weightKg = Number(weight) || 0;
  const value = estimateValue(category, weightKg, PRICES, "Nagpur");

  async function save() {
    const id = scanId ?? newId();
    const db = getDb();
    // Vision scan already created the server lot; reuse its values.
    const finalCategory = scan ? (scan.category as MaterialCategory) : category;
    const finalValue = scan?.estimatedValueInr ?? value;
    await db.runAsync(
      `INSERT INTO lots (id, category, weight_kg, value_inr, photo_uri, photo_hash, timestamp, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, finalCategory, weightKg, finalValue, photoUri, `photo:${id}`, new Date().toISOString()],
    );
    let ledgerRef: string | null = scan?.ledgerRef ?? null;
    let synced = scan !== null;
    if (!scan) {
      try {
        ({ ledgerRef } = await postLot({
          id, collectorId: "col-device", category, weightKg, photoHash: `photo:${id}`,
        }));
        synced = true;
        await db.runAsync(`UPDATE lots SET synced = 1, ledger_ref = ? WHERE id = ?`, [ledgerRef, id]);
      } catch {
        synced = false; // offline: stays queued, flushes on reconnect
      }
    } else {
      await db.runAsync(`UPDATE lots SET synced = 1, ledger_ref = ? WHERE id = ?`, [ledgerRef, id]);
    }
    addLot({ id, photoUri, category: finalCategory, weightKg, valueInr: finalValue, ledgerRef, synced });
    setPhotoUri(null);
    setScan(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
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
      {scanning && <Text style={styles.label}>🔍 Identifying…</Text>}
      {scan && (
        <View style={styles.scanCard}>
          <Text style={styles.scanTitle}>
            🤖 {scan.partKey ? scan.partKey.replace(/-/g, " ") : scan.category}
            {scan.modelHint ? ` · ${scan.modelHint}` : ""}
          </Text>
          <Text style={styles.scanPrice}>{scan.priceText || `₹${value}`}</Text>
        </View>
      )}
      <Text style={styles.label}>{t("weight")}</Text>
      <TextInput
        style={styles.input}
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
      />
      <AudioButton text={`${category}, ${weight} kilo, ${value} rupees`} lang={useApp.getState().language} />
      {scan && scan.nearby.length > 0 && (
        <CenterMap pins={scan.nearby} userLat={21.15} userLng={79.09} />
      )}
      <Pressable style={styles.save} onPress={save}>
        <View style={styles.saveRow}>
          <Text style={styles.saveText}>{t("value")}: ₹{value}</Text>
          <MCIcon name="content-save" size={22} color={theme.accentInk} />
        </View>
      </Pressable>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 20, gap: 12 },
  scanCard: { backgroundColor: theme.card, borderRadius: theme.radius, padding: 14, gap: 4 },
  scanTitle: { color: theme.ink, fontSize: 17, fontWeight: "800", textTransform: "capitalize" },
  scanPrice: { color: theme.accent, fontSize: 18, fontWeight: "800" },
  cam: { height: 280, borderRadius: theme.radius, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  big: { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: 999, width: 84, height: 84, alignItems: "center", justifyContent: "center", alignSelf: "center" },
  cat: { color: theme.accent, fontSize: 20, fontWeight: "800" },
  label: { color: theme.sub, fontSize: 15 },
  input: { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, color: theme.ink, fontSize: 28, borderRadius: theme.radius, padding: 14 },
  save: { backgroundColor: theme.accent, borderRadius: theme.radius, padding: 18, alignItems: "center" },
  saveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveText: { color: theme.accentInk, fontSize: 19, fontWeight: "800" },
});
