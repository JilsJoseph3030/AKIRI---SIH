# Collector UI Redesign — Implementation Plan

Source: Superdesign project `dc61537b-007d-4184-bde7-5c4d58440597`,
draft `c7fdfbb6-ec64-4ed9-a217-d21952640bc7`
"Kabadiwala Connect | Accessible Collector Interface" (v2, current).
Full HTML snapshot: `C:\Users\ACER\AppData\Local\Temp\opencode\kabadiwala-draft.html`.

Target: `app/` (Expo SDK 57 collector app). Scope is the collector home
dashboard first; prices/earnings/safety get card-level upgrades to match.
Backend domain, API routes, and web dashboard are untouched.

## 1. What the draft contains (6 blocks)

1. Sticky header: KABADIWALA brand + avatar + full-width language segment
   (हिंदी / मराठी / ENG).
2. How-it-works card (blue): photo → weight → money, 3 pictorial steps.
3. Today's rates: large cards with bold left color strip, per-card speaker
   button + "listen all".
4. My lots: photo card (category, weight, value, status chip) + full-width
   "find customer" CTA.
5. Earnings: dark summary card (today / pending / total).
6. Safety: horizontal snap carousel, tinted cards with speaker buttons.
7. Floating bottom tab bar with raised center camera FAB
   (भाव / सामान / 📷 / कमाई / प्रोफ़ाइल).

## 2. Draft → React Native translation decisions

- **Theme:** light, per the draft (`#F8FAFC` bg, white cards with `#E2E8F0`
  borders, ink `#0F172A`, primary blue `#2563EB`). The draft's dark slate
  earnings card is kept as a contrast block. Category strips follow the
  draft palette (pcb purple, cable blue, battery red, motor amber, lcd sky,
  crt slate, plastics emerald).
- **Category colors** become dark-mode strip/tint tokens
  (`pcb` purple, `cable` blue, `battery` red, `motor_magnet` amber,
  `lcd_panel` teal, `crt` slate, `mixed_plastics` green) in `ui.tsx`.
- **Icons:** MaterialCommunityIcons via `@expo/vector-icons` (SDK-pinned,
  fonts bundled offline). Category map: pcb `chip`, cable `power-plug`,
  battery `battery-alert`, motor_magnet `magnet`, lcd_panel `television`,
  crt `monitor`, mixed_plastics `recycle`. No emoji pictographs anywhere.
- **Photos/avatars:** draft uses Unsplash/DiceBear URLs. Offline-first app:
  no remote images; emoji placeholders + local lot data from the store.
- **Font:** draft uses Plus Jakarta Sans (webfont). Not adding `expo-font`
  in this pass; extra-bold system type approximates it. (Follow-up below.)
- **Navigation:** app uses `expo-router` Stack. The tab bar is a visual nav
  built from `Link`s on the home screen (no router migration in this pass).

## 3. File-by-file changes

- `app/components/ui.tsx` — add `radiusLg: 28`, `tint` + `strip` category
  color maps, `SpeakDot` (64px round TTS button via `expo-speech`),
  `SectionTitle` row primitive. `AudioButton` unchanged.
- `app/lib/i18n.ts` — add `howItWorks, stepPhoto, stepWeight, stepCash,`
  `todayRates, listenAll, myLots, viewAll, findRecycler, todayEarn,`
  `pendingDues, totalEarn, safetyHeed, ready, emptyLots` in en/hi/mr.
- `app/app/index.tsx` — rewrite: brand header + status chip + `LangSegment`
  (same `setLanguage` + `i18n.changeLanguage` pattern as settings),
  how-it-works card → `/snap`, rates preview (top-3 `PRICES` with localized
  `MATERIALS` labels, per-card `SpeakDot`) → `/prices`, lots preview (store,
  status chip, CTA → `/recyclers`) → `/ledger`, earnings summary (store sums)
  → `/earnings`, safety preview → `/safety`, bottom `TabBar` with center FAB
  → `/snap`. No pricing/ledger logic in the screen — presentation only.
- `app/app/prices.tsx` — rows become strip cards (bigger type, per-row
  `SpeakDot`); keep top `AudioButton` as "listen all".
- `app/app/earnings.tsx` — confirmed-total hero card + pending/total split
  row, matching the draft's dark summary card.
- `app/app/safety.tsx` — single pager becomes a horizontal scroll carousel;
  each card keeps its own `AudioButton`. `CARDS` data unchanged.

## 4. Verification

```bash
cd app && npm run typecheck
npm test   # root delegates to backend vitest; domain untouched, must stay green
```

Manual smoke on Expo Go: home renders all 6 sections, language segment
switches hi/mr/en instantly, speaker buttons speak in the active language,
FAB opens `/snap`, lot save → appears in lots preview + earnings.

## 5. Deliberate follow-ups (not this pass)

- Load Plus Jakarta Sans via `expo-font` for closer draft fidelity.
- Migrate home to `expo-router` Tabs with the FAB as a real tab button.
- Light-theme variant behind a settings toggle (draft palette as reference).
- Trend indicators (% up/down) need a rate-history API — no data yet.
