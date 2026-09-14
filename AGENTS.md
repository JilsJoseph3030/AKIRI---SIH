# Repository Guidelines

## Project Overview

Akiri (SIH26229 Kabadiwala Connect, Team Nexus) brings informal e-waste/scrap collectors into the formal recycling chain. Three workspaces: `app/` (Expo SDK 57 offline-first collector app — Snap & Lot, price board with TTS, recycler match, trust ledger, earnings, safety, mr/hi/en), `backend/` (Hono REST API + pure domain core shared by both frontends), `web/` (Next.js 16 recycler dashboard — lot queue, one-tap confirm-handover, CSV/JSON EPR export, grounded FAQ assistant).

## Architecture & Data Flow

- Domain core (`backend/src/domain/`, zero platform deps) is the single source of truth: `schemas.ts` (7 SIH datasets), `pricing.ts` (`estimateValue`, `rankRecyclers`), `trust-ledger.ts` (`createEntry`/`confirmHandover`/`verifyChain`), `assistant.ts` (`retrieve`/`buildPrompt`/`fallbackReply`), `seed.ts` (Nagpur fixtures). `app` and `web` import it via `@akiri/backend/domain`.
- Collector flow: `snap.tsx` (camera → `ClassifierService` → weight → `estimateValue`) → SQLite insert (`synced=0`) → `postLot()` → zustand `addLot`; `watchConnectivity` (NetInfo) triggers `flushQueue()` on reconnect. Boot wiring (`_layout.tsx`): `initI18n` + `migrate` + queue watcher.
- Ledger flow: intake creates genesis entry → refCode (Crockford base32 of first 5 hash bytes) shown to recycler → dashboard `POST /lots/:id/confirm` appends a `confirmation:<prev-hash>` entry sealing the chain. Hash = `SHA256(photo|weight|lat|lng|timestamp|collector|recycler|prev)`; `HashFn` injected (`expo-crypto` on device, `node:crypto` elsewhere).
- Assistant flow: `AssistantWidget` → `POST /api/assistant` → `loadKnowledge` (server-only `docs/knowledge-base/*.md`) → `retrieve()` → empty = decline + human redirect; else Zen Responses API (`muse-spark-1.3-contributor-free`, key server-side) with `buildPrompt`; key missing / Zen error = raw grounded notes. Never routes collector PII.
- `backend/src/server.ts` is a thin validated layer (per-field checks on `LotIntake`/`ConfirmIntake`, idempotent intake by client UUID) over in-memory `lots`/`chains` Maps — swap `store.ts` for FastAPI+Postgres later, keep the routes.

## Key Directories

- `app/app/` — Expo Router screens: `_layout`, `index` (tile home), `snap`, `prices`, `recyclers`, `ledger`, `earnings`, `safety`, `settings`.
- `app/lib/` — platform adapters + seams: `api.ts`, `store.ts` (zustand), `db.ts`, `classifier.ts`, `i18n.ts`.
- `app/components/` — `ui.tsx` (theme tokens + `AudioButton`).
- `backend/src/domain/` — pure logic (see above). `backend/src/server.ts` + `store.ts` — API + store. `backend/tests/` — vitest suites.
- `web/app/` — `page.tsx` (landing), `dashboard/page.tsx` (client lot queue), `api/assistant/route.ts` (server proxy). `web/components/AssistantWidget.tsx`, `web/lib/knowledge.ts`.
- `docs/knowledge-base/` — 6 grounding docs: `brief`, `features`, `epr-basics`, `handover`, `pricing`, `faq`.
- Voice channel (`backend/src/voice/` + `domain/voice.ts`): Gather-based
  TwiML turns (no Media Streams/Pipecat — second runtime unjustified for
  3 flows). All `/voice/*` webhooks gated by HMAC-SHA1 signature against
  `TWILIO_AUTH_TOKEN` + exact public URL (`VOICE_PUBLIC_BASE_URL`).
  Phone lots are `pending_pickup` with NO chain entry until photo handover;
  callers are `voice:<hash12>` pseudonyms (salt `VOICE_SALT`).
  Call agent: Muse Spark 1.3 contributor-free (`muse-spark-1.3-contributor-free`
  via `/zen/v1/responses`) guides understanding in 13 Indian languages with
  a per-request rate table; keyword detectors are the offline fallback.
  NOTE (verified 2026-09-11): the free tier rejects raw API calls
  ("can only be used in OpenCode") and paid needs a payment method — until
  either is resolved the keyword path carries all turns.


```bash
npm install                                    # all workspaces (hoisted at root)
npm test                                       # backend vitest (only workspace with tests)
npm run typecheck --workspaces --if-present
cd backend && npm run dev                      # API :8080 (loads .env via --env-file)
cd web && npm run dev                          # dashboard :3000
cd app && npx expo start                       # Expo Go (doctor: 21/21 clean)
cd app && EXPO_PUBLIC_API_BASE_URL=http://<pc-lan-ip>:8080 npx expo start  # physical phone (PowerShell: $env:...)
```

## Code Conventions & Common Patterns

- TypeScript strict everywhere (`tsconfig.base.json`: ES2022, bundler resolution, `noEmit`); relative imports are extensionless (Metro cannot resolve NodeNext `.js` suffixes). No ESLint/Prettier configured.
- Domain logic lives in `backend/src/domain`; apps hold UI + platform adapters only. Never leak pricing/ranking/ledger math into components.
- Boundary validation, no blind casts: Hono routes assert `LotIntake`/`ConfirmIntake` then check each field (`isCategory` guard); dashboard parses network JSON via `isLot`/`toLot`/`asLots` guards with mock fallback.
- Errors: typed JSON + status codes (`{ error }` 400/404); sync failures stay queued and break the flush loop for retry. No swallowed failures.
- State: zustand (`language`, `digitalPayments`, `online`, `lots` + `addLot`/`markSynced`/`newId`); cash is default, digital is opt-in toggle, never a gate.
- Naming: files match domain concept (`trust-ledger`, `pricing`, `assistant`); tables `lots`/`prices`/`ledger_entries`; lots double as sync queue via `synced` flag (idempotent client UUIDs).
- Static string-keyed lookups are `Record<K,V>` (e.g. i18n resources, classifier keywords); keep tiny single-use helpers inlined.

## Important Files

- Entry points: `app/app/_layout.tsx`, `backend/src/server.ts`, `web/app/dashboard/page.tsx`, `web/app/api/assistant/route.ts`.
- Seams to preserve: `ClassifierService` (`app/lib/classifier.ts` — swap in TFLite without touching UI), `HashFn` (`backend/src/domain/trust-ledger.ts`), mock-flag API client (`EXPO_PUBLIC_API_MOCK`, `app/lib/api.ts`).
- Configs: root `package.json` (workspaces + overrides), `tsconfig.base.json`, `app/app.json` (scheme `akiri`, plugins router/camera/localization, `typedRoutes`), `web/next.config.ts` (`transpilePackages: ['@akiri/backend']`), `backend/package.json` (`exports`: `.` server, `./domain` core).
- `// TODO: anchor chain root to CPCB-compatible format` (`trust-ledger.ts`) — do not build speculative CPCB integration.

## Runtime/Tooling Preferences

- Node >= 20, npm workspaces (hoisted; `@akiri/backend` consumed via `"*"` symlink; Metro resolves it natively, Next needs `transpilePackages`).
- Backend dev runner is `tsx` (Node strip-types can't resolve `.js`→`.ts` imports); `backend/tsconfig.json` outDir/rootDir are inert under inherited `noEmit`.
- Expo SDK 57 / RN 0.86.3 / react 19.2.3 exact everywhere via root `overrides` (also pins reanimated 4.5.1 + worklets 0.10.1 — SDK-table set; drawer-layout accepts ≥2.0). No Moti (Reanimated-3-only), no NativeWind/Gluestack (no Windows CLI support; StyleSheet keeps the app lean).
- TS versions differ by workspace: `app` ~6.0.3 (expo-pinned), others ~5.9.0.

## Testing & QA

- Vitest 3.x zero-config (no config file; node env, default include) in `backend/tests/`: `trust-ledger.test.ts` (3-entry chain verifies + distinct refCodes; weight tamper fails; confirm seals + stays verifiable — real `node:crypto` hash through the injected seam, no mocks) and `assistant.test.ts` (in-scope retrieval grounds the prompt; out-of-scope returns `[]` → `fallbackReply` declines to human).
- Run: `npm test` (root delegates to backend). No tests in `app/`/`web/`; no coverage gate.
- Gaps an author should know: `pricing.ts` (zero weight, unknown location fallback, rounding) and `rankRecyclers` (auth filter, distance cutoff) have no unit tests; API routes and UI flows are verified by live smoke (`POST /lots` → confirm `valid:true` → CSV export), not automated tests.
