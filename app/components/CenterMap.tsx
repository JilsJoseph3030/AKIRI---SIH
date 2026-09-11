import { StyleSheet, Text, View } from "react-native";
import { theme } from "./ui";

export interface MapPin {
  id: string;
  area: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  offeredRate?: number;
}

/**
 * Offline collection-center map: relative pin layout over recycler GPS,
 * no tiles, no API keys, no network. Works in Expo Go and airplane mode.
 */
export default function CenterMap({
  pins,
  userLat,
  userLng,
}: {
  pins: MapPin[];
  userLat: number;
  userLng: number;
}) {
  const lats = [...pins.map((p) => p.lat), userLat];
  const lngs = [...pins.map((p) => p.lng), userLng];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 0.01;
  const spanLng = maxLng - minLng || 0.01;
  const x = (lng: number) => 8 + ((lng - minLng) / spanLng) * 84;
  const y = (lat: number) => 8 + ((maxLat - lat) / spanLat) * 70;

  return (
    <View style={styles.map} accessibilityLabel="Nearby collection centers map">
      <View style={styles.gridH} />
      <View style={[styles.gridH, { top: "55%" }]} />
      <View style={styles.gridV} />
      <View style={[styles.gridV, { left: "55%" }]} />
      {pins.map((p, i) => (
        <View key={p.id} style={[styles.pinWrap, { left: `${x(p.lng)}%`, top: `${y(p.lat)}%` }]}>
          <View style={styles.pin}>
            <Text style={styles.pinText}>{i + 1}</Text>
          </View>
          <Text style={styles.pinLabel} numberOfLines={1}>
            {p.area.split(",")[0]}
            {p.distanceKm !== undefined ? ` · ${p.distanceKm.toFixed(1)}km` : ""}
          </Text>
        </View>
      ))}
      <View style={[styles.youWrap, { left: `${x(userLng)}%`, top: `${y(userLat)}%` }]}>
        <View style={styles.you} />
        <Text style={styles.youLabel}>You</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 240,
    backgroundColor: "#E8EFE4",
    borderRadius: theme.radius,
    overflow: "hidden",
  },
  gridH: {
    position: "absolute", left: 0, right: 0, top: "30%",
    height: 2, backgroundColor: "#FFFFFF", opacity: 0.8,
  },
  gridV: {
    position: "absolute", top: 0, bottom: 0, left: "30%",
    width: 2, backgroundColor: "#FFFFFF", opacity: 0.8,
  },
  pinWrap: { position: "absolute", width: 110, marginLeft: -14, marginTop: -14 },
  pin: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: theme.accent,
    alignItems: "center", justifyContent: "center",
  },
  pinText: { color: "#101613", fontWeight: "800" },
  pinLabel: { fontSize: 11, color: "#1B241E", fontWeight: "700", marginTop: 2 },
  youWrap: { position: "absolute", marginLeft: -8, marginTop: -8, alignItems: "center" },
  you: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: "#2563EB",
    borderWidth: 3, borderColor: "#FFFFFF",
  },
  youLabel: { fontSize: 11, fontWeight: "800", color: "#1B241E" },
});
