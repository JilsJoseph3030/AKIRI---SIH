import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MCIcon from "@expo/vector-icons/MaterialCommunityIcons";
import { useTranslation } from "react-i18next";
import { MATERIALS, PRICES } from "@akiri/backend/domain";
import i18n, { type AppLanguage } from "../lib/i18n";
import { useApp } from "../lib/store";
import { AudioButton, SectionTitle, SpeakDot, strip, theme, tint } from "../components/ui";
import type { IconName } from "../components/ui";

const LANGS: { code: AppLanguage; label: string }[] = [
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
  { code: "en", label: "ENG" },
];

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

export default function Home() {
  const { t } = useTranslation();
  const lang = useApp((s) => s.language);
  const setLanguage = useApp((s) => s.setLanguage);
  const online = useApp((s) => s.online);
  const lots = useApp((s) => s.lots);
  const pending = lots.filter((l) => !l.synced).length;

  const topRates = PRICES.slice(0, 3);
  const spokenRates = topRates
    .map((p) => `${labelFor(p.category, lang)} ${p.ratePerKg} rupees per kilo`)
    .join(". ");
  const earned = lots.filter((l) => l.synced).reduce((n, l) => n + l.valueInr, 0);
  const due = lots.filter((l) => !l.synced).reduce((n, l) => n + l.valueInr, 0);
  const first = lots[0];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.wrap}>
        {/* Brand + status */}
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <View style={styles.badge}>
              <MCIcon name="recycle" size={28} color={theme.accentInk} />
            </View>
            <Text style={styles.brand}>Akiri</Text>
          </View>
          <View style={styles.netRow}>
            <View style={[styles.dot, { backgroundColor: online ? theme.accent : theme.danger }]} />
            <Text style={styles.net}>{online ? t("online") : t("offline")}</Text>
            {pending > 0 && (
              <View style={styles.netRow}>
                <MCIcon name="clock-outline" size={16} color={theme.warn} />                <Text style={styles.net}>{pending}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Language segment (draft: full-width selector) */}
        <View style={styles.seg}>
          {LANGS.map((l) => (
            <Pressable
              key={l.code}
              accessibilityRole="button"
              style={[styles.segBtn, lang === l.code && styles.segActive]}
              onPress={() => {
                setLanguage(l.code);
                i18n.changeLanguage(l.code);
              }}
            >
              <Text style={[styles.segText, lang === l.code && styles.segTextActive]}>
                {l.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* How it works (draft: saturated 3-step card) */}
        <Link href="/snap" asChild>
          <Pressable style={styles.how}>
            <Text style={styles.howTitle}>{t("howItWorks")}</Text>
            <View style={styles.steps}>
              <View style={styles.step}>
                <View style={styles.stepDot}>
                  <MCIcon name="camera" size={30} color={theme.accentInk} />
                </View>
                <Text style={styles.stepText}>{t("stepPhoto")}</Text>
              </View>
              <MCIcon name="arrow-right" size={22} color="rgba(255,255,255,0.5)" style={styles.arrow} />
              <View style={styles.step}>
                <View style={styles.stepDot}>
                  <MCIcon name="scale" size={30} color={theme.accentInk} />
                </View>
                <Text style={styles.stepText}>{t("stepWeight")}</Text>
              </View>
              <MCIcon name="arrow-right" size={22} color="rgba(255,255,255,0.5)" style={styles.arrow} />
              <View style={styles.step}>
                <View style={styles.stepDot}>
                  <MCIcon name="currency-inr" size={30} color={theme.accentInk} />
                </View>
                <Text style={styles.stepText}>{t("stepCash")}</Text>
              </View>
            </View>
          </Pressable>
        </Link>

        {/* Today's rates (draft: strip cards + per-card TTS) */}
        <SectionTitle
          title={t("todayRates")}
          right={<AudioButton text={spokenRates} lang={lang} />}
        />
        {topRates.map((p) => {
          const color = strip[p.category] ?? theme.accent;
          return (
            <View
              key={`${p.category}-${p.location}`}
              style={[styles.rate, { borderLeftColor: color }]}
            >
              <View style={styles.rateLeft}>
                <View style={styles.rateCatRow}>
                  <MCIcon name={CAT_ICON[p.category] ?? "tag"} size={28} color={color} />
                  <Text style={styles.rateCat}>{labelFor(p.category, lang)}</Text>
                </View>
                <Text style={styles.rateNum}>
                  ₹{p.ratePerKg}
                  <Text style={styles.rateUnit}>/kg</Text>
                </Text>
              </View>
              <SpeakDot
                text={`${labelFor(p.category, lang)}, ${p.ratePerKg} rupees per kilo`}
                lang={lang}
              />
            </View>
          );
        })}
        <Link href="/prices" asChild>
          <Pressable style={styles.more}>
            <Text style={styles.moreText}>{t("viewAll")}</Text>
          </Pressable>
        </Link>

        {/* My lots (draft: lot card + find-customer CTA) */}
        <SectionTitle
          title={t("myLots")}
          right={
            <Link href="/ledger" asChild>
              <Pressable>
                <Text style={styles.moreText}>{t("viewAll")}</Text>
              </Pressable>
            </Link>
          }
        />
        {first ? (
          <View style={styles.lot}>
            <View style={styles.lotRow}>
              <MCIcon
                name={CAT_ICON[first.category] ?? "package-variant"}
                size={56}
                color={theme.ink}
              />
              <View style={styles.lotInfo}>
                <Text style={styles.lotCat}>{labelFor(first.category, lang)}</Text>
                <Text style={styles.lotSub}>
                  {first.weightKg} kg · ₹{first.valueInr}
                </Text>
                <View style={[styles.chip, first.synced ? styles.chipOk : styles.chipDue]}>
                  <MCIcon
                    name={first.synced ? "check" : "clock-outline"}
                    size={14}
                    color={first.synced ? tint.okInk : tint.warnInk}
                  />
                  <Text style={[styles.chipText, { color: first.synced ? tint.okInk : tint.warnInk }]}>
                    {first.synced ? t("ready") : t("pending")}
                  </Text>
                </View>
              </View>
            </View>
            <Link href="/recyclers" asChild>
              <Pressable style={styles.cta}>
                <Text style={styles.ctaText}>{t("findRecycler")}</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          <Text style={styles.empty}>{t("emptyLots")}</Text>
        )}

        {/* Earnings summary (draft: dark summary card) */}
        <Link href="/earnings" asChild>
          <Pressable style={styles.earn}>
            <Text style={styles.earnCap}>{t("todayEarn")}</Text>
            <Text style={styles.earnBig}>₹{earned}</Text>
            <View style={styles.earnSplit}>
              <Text style={styles.earnSub}>
                {t("pending")}: ₹{due}
              </Text>
              <Text style={styles.earnSub}>
                {t("total")}: ₹{earned + due}
              </Text>
            </View>
          </Pressable>
        </Link>

        {/* Safety preview (draft: tinted safety cards) */}
        <SectionTitle title={t("safetyHeed")} />
        <Link href="/safety" asChild>
          <Pressable style={styles.safe}>
            <MCIcon name="fire" size={44} color={tint.dangerInk} />
            <Text style={[styles.safeText, { color: tint.dangerInk }]}>{t("noBurn")}</Text>
            <MCIcon name="chevron-right" size={24} color={theme.sub} />
          </Pressable>
        </Link>
      </ScrollView>

      {/* Bottom tab bar (draft: floating bar + raised camera FAB) */}
      <View style={styles.tabbar}>
        <TabItem href="/prices" icon="chart-bar" label={t("prices")} />
        <TabItem href="/ledger" icon="package-variant" label={t("ledger")} />
        <Link href="/snap" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={t("snap")} style={styles.fab}>
            <MCIcon name="camera" size={34} color={theme.accentInk} />
          </Pressable>
        </Link>
        <TabItem href="/earnings" icon="wallet" label={t("earnings")} />
        <TabItem href="/settings" icon="cog" label={t("settings")} />
      </View>
    </View>
  );
}

function TabItem({
  href,
  icon,
  label,
}: {
  href: "/prices" | "/ledger" | "/earnings" | "/settings";
  icon: IconName;
  label: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.tab}>
        <MCIcon name={icon} size={28} color={theme.sub} />
        <Text style={styles.tabLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  wrap: { padding: 20, gap: 18, paddingBottom: 140 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { color: theme.ink, fontSize: 32, fontWeight: "800" },
  netRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  net: { color: theme.sub, fontSize: 14 },
  seg: { flexDirection: "row", gap: 8, backgroundColor: "#E2E8F0", borderRadius: 20, padding: 6 },
  segBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  segActive: { backgroundColor: theme.card },
  segText: { color: theme.sub, fontSize: 18, fontWeight: "700" },
  segTextActive: { color: theme.ink },
  how: { backgroundColor: theme.accent, borderRadius: theme.radiusLg, padding: 24, gap: 18 },
  howTitle: { color: theme.accentInk, fontSize: 24, fontWeight: "800" },
  steps: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  step: { flex: 1, alignItems: "center", gap: 8 },
  stepDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { color: theme.accentInk, fontSize: 14, fontWeight: "700", textAlign: "center" },
  arrow: { marginTop: 18 },
  rate: {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: theme.radiusLg,
    borderLeftWidth: 12,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rateLeft: { gap: 6, flex: 1 },
  rateCatRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rateCat: { color: theme.ink, fontSize: 22, fontWeight: "800", flex: 1 },
  rateNum: { color: theme.ink, fontSize: 36, fontWeight: "800" },
  rateUnit: { color: theme.sub, fontSize: 18, fontWeight: "400" },
  more: { alignSelf: "flex-start", paddingVertical: 6 },
  moreText: { color: theme.accent, fontSize: 17, fontWeight: "700" },
  lot: { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: theme.radiusLg, padding: 16, gap: 16 },
  lotRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  lotInfo: { flex: 1, gap: 4 },
  lotCat: { color: theme.ink, fontSize: 22, fontWeight: "800" },
  lotSub: { color: theme.sub, fontSize: 18 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  chipOk: { backgroundColor: tint.okBg },
  chipDue: { backgroundColor: tint.warnBg },
  chipText: { fontSize: 14, fontWeight: "700" },
  cta: { backgroundColor: theme.accent, borderRadius: 18, paddingVertical: 20, alignItems: "center" },
  ctaText: { color: theme.accentInk, fontSize: 22, fontWeight: "800" },
  empty: { color: theme.sub, fontSize: 17 },
  earn: { backgroundColor: "#0F172A", borderRadius: 32, padding: 32, gap: 6 },
  earnCap: { color: "#94A3B8", fontSize: 18, fontWeight: "700" },
  earnBig: { color: "#FFFFFF", fontSize: 56, fontWeight: "800" },
  earnSplit: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  earnSub: { color: "#E2E8F0", fontSize: 18, fontWeight: "700" },
  safe: {
    backgroundColor: tint.dangerBg,
    borderColor: tint.dangerBd,
    borderWidth: 2,
    borderRadius: theme.radiusLg,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  safeText: { color: theme.ink, fontSize: 19, fontWeight: "700", flex: 1 },
  tabbar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: 32,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tab: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 8 },
  tabLabel: { color: theme.sub, fontSize: 11, fontWeight: "700" },
  fab: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -40,
    borderWidth: 6,
    borderColor: theme.bg,
  },
});
