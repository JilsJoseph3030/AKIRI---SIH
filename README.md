# Akiri — Kabadiwala Connect (SIH26229)

Collector app for informal e-waste/scrap collectors + recycler dashboard.
Team Nexus, lead Christopher Joshy.

## Run it

```bash
npm install
cd mobile && npx expo start     # scan QR with Expo Go
cd web && npm run dev           # http://localhost:3000/dashboard
```

Backend is a typed client + mock fixtures behind `API_BASE_URL` /
`EXPO_PUBLIC_API_MOCK=true` until FastAPI lands.

## Version pins (researched 2026-09-11, don't trust training data)

- Expo SDK **57** / React Native **0.86** / React **19.2**
- Reanimated **4.x** + `react-native-worklets` (Moti dropped — Reanimated-3-only)
- Assistant: `POST https://opencode.ai/zen/v1/responses`,
  model `muse-spark-1.3-contributor-free` (free tier; prompts may train
  future Meta models — disclosed in widget About panel)

## Demo script

1. Home → Snap & Lot → photo → mock classify → weight → value.
2. Airplane mode on → repeat + open prices/earnings/safety (all cached).
3. Airplane mode off → queue syncs.
4. Settings → मराठी/हिंदी/English toggle.
5. Dashboard → confirm handover with reference code → CSV export.
6. Assistant: in-scope FAQ (grounded) vs out-of-scope (declines).
