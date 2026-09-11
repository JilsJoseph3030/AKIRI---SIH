import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { initI18n } from "../lib/i18n";
import { migrate } from "../lib/db";
import { flushQueue, watchConnectivity } from "../lib/api";

export default function RootLayout() {
  useEffect(() => {
    initI18n();
    migrate();
    const off = watchConnectivity((online) => {
      if (online) flushQueue();
    });
    return off;
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#101613" },
          headerTintColor: "#F2F5F0",
          contentStyle: { backgroundColor: "#101613" },
        }}
      />
    </>
  );
}
