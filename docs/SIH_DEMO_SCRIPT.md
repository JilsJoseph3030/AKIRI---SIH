# Akiri E-Waste Management - Live Demo Script (3 Minutes)

## 0:00 - 0:45 | The Problem & The Pseudonymous Solution
**Speaker:** 
"Judges, India generates 3 million tonnes of E-Waste annually, yet 95% is handled by the informal sector. These informal *kabadiwalas* suffer from severe health hazards due to open-burning, while authorized recyclers starve for raw materials.
Why won't the informal sector use digital apps? Because they deeply fear tax audits, GST tracking, and government scrutiny.

Our solution is **Akiri**. It’s the first *pseudonymous*, offline-first marketplace connecting informal pickers directly to enterprise recyclers—bypassing exploitative middlemen.

*(Action: Show the login screen)* 
Watch this: Our waste picker simply scans an anonymous QR badge. No PAN card. No phone number required. They are logged in instantly. Total trust."

## 0:45 - 1:30 | Live Hardware Demo (BLE Scale) & Offline Ingestion
**Speaker:** 
"We are deep in a scrap yard. There is zero internet connectivity. 
*(Action: Tap 'Start New Weighing' on the vernacular dashboard)* 

The Akiri app uses Bluetooth Low Energy to instantly pair with our proprietary ESP32 Smart Scale.
*(Action: Turn on the ESP32 emulator script, watch the live weight ramp up)* 

Look at the screen—the weight automatically synchronizes directly from the hardware into the app. This prevents manual-entry tampering and friction. It registers exactly 45.5kg of PCB High-Grade material. We lock and process the transaction entirely offline."

## 1:30 - 2:15 | Anti-Fraud & The Unit Economics Engine
**Speaker:** 
"Behind the scenes, our Engine runs a precise Density Validation check. If an unorganized collector tries to cheat by hiding sand or lead inside the batch, the app flags an anomaly against standard volumetric algorithms and triggers a Hazmat alert.

But why would the waste picker use this? Look at the Unit Economics:
*(Action: Point to the Unit Economics UI Component)*
By connecting directly to an authorized recycler through Akiri, this individual just bypassed the unorganized aggregators and increased their cash payout by **40%**. They just made an extra ₹1,300 today. Economics is the ultimate driver of behavioral change."

## 2:15 - 3:00 | Cloud Synchronization & CPCB Audit Traceability
**Speaker:** 
"Finally, the kabadiwala returns home to a Wi-Fi zone. The app automatically background-syncs the cached SQLite transactions to our Next.js cloud.

*(Action: Switch to the Recycler Desktop Portal)*
The Authorized Enterprise Recycler receives the lot. They click 'Confirm Weight'.
Instantly, our backend engine calculates the exact mass-balance yield—predicting how much pure Copper and Precious Metals will be extracted. It then generates a compliant, printable PDF CPCB Audit Certificate.

Akiri formalizes the informal sector, protects human health, and enforces mass-balance compliance."
