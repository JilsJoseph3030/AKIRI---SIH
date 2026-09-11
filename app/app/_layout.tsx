import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { initI18n } from "../lib/i18n";
import { migrate } from "../lib/db";
import { flushQueue, watchConnectivity } from "../lib/api";

export default function RootLayout() {
  // Gate first render until i18n is initialized — otherwise the first
  // useTranslation() fires before the instance exists (NO_I18NEXT_INSTANCE).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let off: (() => void) | undefined;
    (async () => {
      await initI18n();
      await migrate();
      off = watchConnectivity((online) => {
        if (online) flushQueue();
      });
      setReady(true);
    })();
    return () => off?.();
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTintColor: "#0F172A",
          headerTitleStyle: { fontWeight: "800" },
          contentStyle: { backgroundColor: "#F8FAFC" },
        }}
      />
    </>
  );
}
