# Akiri — SIH26229 Kabadiwala Connect (Team Nexus)

Vernacular, offline-tolerant collector app + recycler dashboard +
embedded FAQ assistant grounded on `docs/knowledge-base`.

## Layout

- `app/` — Expo SDK 57 + Expo Router collector app (Android-first,
  Expo Go compatible). Imports pure domain logic from
  `@akiri/backend/domain`; platform adapters (SQLite, camera, TTS)
  live in `app/lib`.
- `backend/` — TypeScript REST API (Hono, `npm run dev`, :8080) plus
  the pure domain core (`src/domain/*`: dataset schemas, pricing,
  recycler ranking, hash-chained Trust Ledger, assistant RAG gate).
  Vertical slice uses an in-memory/JSON store behind the same REST
  contract a FastAPI + PostgreSQL service will implement later —
  swap the store, keep the routes. Domain has zero node deps so
  `app` and `web` import it directly.
- `web/` — Next.js 16 recycler dashboard + `/api/assistant` (OpenCode
  Zen proxy, key server-side only).
- `docs/knowledge-base/` — assistant grounding docs (the "training").

## Conventions

- TypeScript throughout, `npx tsc --noEmit` clean per workspace.
- Domain logic lives in `backend/src/domain`; apps hold only UI +
  platform adapters. Never leak business math into components.
- Offline-first: write to `expo-sqlite` immediately, enqueue to sync
  queue, flush on NetInfo reconnect. Queue rows are idempotent
  (client-generated UUID + `synced` flag).
- Trust Ledger: local hash-chain only, never a public chain.
  `entry_hash = SHA256(photo_hash|weight|lat|lng|timestamp|collector_id|recycler_id|prev_hash)`.
  Hash function is injected (`HashFn`) — `expo-crypto` on device,
  `node:crypto` on web/backend.
  `// TODO: anchor chain root to CPCB-compatible format`
- Collector PII: id, preferred language, general area, history only.
  Never route PII or financial details through the AI assistant.
- Styling (app): plain `StyleSheet` + tiny theme tokens, icon-forward
  big-touch UI. Deliberate deviation: no NativeWind/Gluestack copy-in
  (Gluestack CLI has no Windows support; lean entry-level Android
  target) and no Moti (targets Reanimated 3, breaks on SDK 57's
  Reanimated 4 — Reanimated 4 APIs used directly).
- Assistant: keyword RAG over `docs/knowledge-base` + Muse Spark 1.3
  Contributor Free via `POST https://opencode.ai/zen/v1/responses`
  (Responses API, `Authorization: Bearer $OPENCODE_ZEN_API_KEY`).
  Out-of-scope questions decline + redirect, never hallucinate.

## Commands

```bash
npm install
npm test                                   # backend unit tests (vitest)
npm run typecheck --workspaces --if-present
```
## Version notes (2026-09-11, verified against npm registry + expo-doctor)

| Package | Pinned | Why |
|---|---|---|
| react / react-dom | 19.2.3 (exact, all workspaces) | single copy, matches SDK57 table |
| react-native-reanimated | 4.5.1 | SDK57 table; drawer-layout accepts ≥2.0 so no conflict |
| react-native-worklets | 0.10.1 | reanimated 4.5.x peer |
| expo-* / expo-router | ~57.0.0 | SDK57 majors (expo unified majors at 57) |

## Verification checklist

- `npm test` green (ledger chain + tamper + assistant scope tests)
- `tsc --noEmit` clean in `backend`, `web`, `app`
- Airplane-mode: lot create, price board, earnings, safety all work
  offline; queue visibly syncs on reconnect
- Language toggle mr/hi/en swaps UI text + TTS voice
- Dashboard confirm-handover seals ledger entry; CSV/JSON export works
