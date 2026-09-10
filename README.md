# Akiri: E-Waste Management Platform ♻️

Akiri is an offline-first, pseudonymous marketplace connecting the informal E-Waste sector (kabadiwalas) directly with enterprise Authorized Recyclers. By bypassing unorganized middlemen, Akiri improves waste picker unit economics by up to 40%, enforces Central Pollution Control Board (CPCB) mass-balance compliance, and prevents hazardous informal recycling practices.

## 🚀 Current Status & Architecture Update

**Status: Production Ready (Hackathon / Field Testing)**

The end-to-end architecture has been successfully built, unit-tested, and prepared for live demonstration. The platform spans a local SQLite mobile cache, a Python hardware emulator, a Next.js API sync engine, and a Supabase PostgreSQL backend.

### Completed Features:
1. **Offline-First Mobile App (React Native / Expo)**: Built using `expo-sqlite`, allowing informal collectors to log transactions deep in scrapyards without internet connectivity.
2. **BLE Hardware Ingestion**: Bluetooth Low Energy hooks integrate directly with ESP32 smart scales to prevent manual entry fraud.
3. **CPCB Anti-Fraud Engine**: Volumetric density validation flags anomalies (e.g., hiding sand/lead) and hardcoded mass-balance matrices predict precise Copper, Precious Metal, and Plastic yields.
4. **Pseudonymous QR Authentication**: High-trust, low-friction login that doesn't require a PAN or phone number, protecting collectors from tax scrutiny fears.
5. **Vernacular Safety Engine**: High-contrast, pictorial UI tailored for low-literacy users, featuring `expo-av` audio readouts in Hindi and Marathi to prevent open-air burning and acid leaching.
6. **Recycler Enterprise Portal (Next.js)**: A secure web dashboard for authorized recyclers to scan QR handovers, confirm weights, and dynamically generate compliant PDF CPCB Audit Receipts using `jsPDF`.

---

## 🛠️ How to Use & Test the Project

### 1. Hardware Bluetooth Emulator (ESP32 Mock)
You don't need a physical scale to test the app. We have built a Python GATT server to broadcast live weights.
```bash
# 1. Install the bless library in your active python environment
python -m pip install bless

# 2. Run the emulator
python scripts/esp32-scale-emulator.py
```
*The emulator will broadcast as `Akiri_Scale` and ramp the weight dynamically from 0 to 45.5kg.*

### 2. Next.js Cloud Backend & Recycler Portal
Start the Next.js server to test the Recycler Dashboard and API sync endpoints.
```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```
*Open `http://localhost:3000/recycler/dashboard` to test the Web Portal and generate PDF Audit receipts.*

### 3. Mobile App (React Native UI)
Run the React Native shell to test the Vernacular Dashboard, BLE Ingestion, and Earnings Ledger.
```bash
# Start the Expo bundler
npx expo start
```
*Scan the generated QR code with the Expo Go app on your physical iPhone/Android device to view the app UI. You must use a physical device to test Bluetooth functionality.*

### 4. Running the Math & Anti-Fraud Unit Tests
We use Vitest to mathematically prove the CPCB yield conversions and Unit Economics calculations.
```bash
npx vitest run
```

---

## 📁 Repository Structure
- `app/` - Next.js App Router (Includes Recycler Dashboard and API Sync Routes).
- `components/` - React Native UI Components (Collector Dashboard, Ledger, Safety UI).
- `lib/` - Core Logic (CPCB Engine, Auth, Vernacular translation, PDF Generator).
- `db/` - Database Architecture (Postgres Schema and SQLite Engine).
- `scripts/` - Python Hardware Emulator.
- `docs/` - Demo scripts and presentation assets.
- `tests/` - Vitest suites for verifying logic constraints.
