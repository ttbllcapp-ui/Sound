# SOUND PRO — PRD

Premium iOS-style audio utility app with 3 tabs (Boost, EQ, Meter) + Settings bottom sheet. Dark "Performance Pro" theme. Single language: English. All controls functional, simulated data (no native audio APIs).

## Architecture
- Expo Router single-screen app (`app/index.tsx`) hosting a custom tab switcher.
- Tabs in `src/sound-pro/`:
  - `BoostTab.tsx` — circular gauge, volume/bass sliders, sound profile, 8D audio card with rotating animation, noise cleaning toggle, timer chips, speaker test, hearing-guardian alerts, activate button.
  - `EqTab.tsx` — audio visualizer (24 bars, 120ms tick), 10 named presets, 10 vertical PanResponder sliders, BASS/MID/TREBLE summary cards, save preset button.
  - `MeterTab.tsx` — circular gauge (0–120 dB), MIN/AVG/PEAK cards, 40-bar live chart (130ms), 4-card reference grid, mode selector (Standard/Sleep/Evidence), sensitivity & weighting chips, START/STOP + reset, Sleep report, PRO export buttons, persistent 5-item history (AsyncStorage).
  - `SettingsSheet.tsx` — slide-up modal with calibration, display toggles, noise alert + threshold slider, premium promo card, about list.
- `CircularGauge.tsx` — SVG 270° arc gauge (shared by Boost & Meter).
- `VerticalSlider.tsx` — PanResponder-based slider (EQ bands).
- `theme.ts` — design tokens + color/status bucket functions.

## Key Features
- Dynamic gauge colors per value (green → red).
- Hearing guardian conditional alerts at 200–350% and 350%+ boost.
- Simulated dB readings with sensitivity & weighting modifiers; sleep mode lower base values; evidence mode pulsing REC timestamp.
- 5 most recent recordings persisted via `@/src/utils/storage`.
- PRO badges on export buttons → alert (no paywall).
- 8D Audio expandable card with rotating dashed circles + orbit dot animation.

## No backend
All state local. Backend remains untouched.

## TestIDs
Comprehensive `testID` on every interactive element (`tab-*`, `boost-*`, `eq-*`, `meter-*`, `settings-*`).
