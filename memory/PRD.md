# SOUND PRO — PRD (v2)

Premium iOS-style audio utility app — **completely free**, no PRO/paywall. Three tabs (Boost · EQ · Meter), settings sheet, and cinematic onboarding.

## Phase 1 (current)

### New since v1
- **Cinematic onboarding** — 3 swipeable pages with bespoke SVG art per slide (radiating arcs / EQ bars / sweeping gauge). Last page asks for mic permission (UI-only in Phase 1 — wired to real expo-audio in Phase 2). Persisted via `soundpro.onboarded.v1`.
- **No paywall** — Premium section removed from settings; replaced with "100% FREE" badge + manifesto card. Export buttons replaced with single "Share Latest Summary" (uses Share API).
- **Live spectrum analyzer** (24-band) under the dB gauge, smoothed gaussian profile around a drifting dominant band.
- **Dominant frequency reading** (Hz / kHz) under the gauge while measuring.
- **Smooth gauge animation** — `CircularGauge` self-interpolates with eased cubic over 350 ms.
- **EQ custom presets** — save with a name (text input modal), persisted in `soundpro.eq.custom.v1`, shown as ⭐ amber chips, long-press to delete.
- **History modal** — tap a row to open a bottom sheet with sparkline (SVG area path), stats, and share button; long-press to delete (confirm dialog).
- **Recordings now persist full session as a downsampled (≤120 pts) readings array** for the detail sparkline.
- **Haptics everywhere** — selection on chips, heavy on START, success on calibration, warn on destructive actions (`expo-haptics`).
- **Glass card primitive** (`GlassCard.tsx`) — BlurView on native, backdrop-filter on web. Available for future use.
- **Tab-specific dual glow** in header — top arc + lower belly glow recolored per tab.
- **Larger, refined gauge** (200 px) with rounded display number (52 pt, tracking -1.5).
- **Settings polish** — icons on About rows, descriptive subtitle per toggle.

### Architecture
- `app/index.tsx` — onboarding gate (storage flag), header, custom tab bar, content scroll, settings modal.
- `src/sound-pro/`:
  - `OnboardingScreen.tsx` — 3-page paged ScrollView with cinematic SVG art and dot indicator.
  - `CircularGauge.tsx` — eased value smoothing, optional `subText` for frequency.
  - `BoostTab.tsx` · `EqTab.tsx` · `MeterTab.tsx` — feature screens.
  - `SettingsSheet.tsx` — no premium; just calibration / display / alerts / about.
  - `HistoryDetailModal.tsx` — detail bottom sheet with SVG sparkline + share.
  - `GlassCard.tsx` — cross-platform glass primitive.
  - `VerticalSlider.tsx` — PanResponder slider for EQ.
  - `theme.ts` — design tokens + color/status bucket fns.
  - `haptic.ts` — cross-platform haptic wrapper (no-op on web).

### Storage keys
- `soundpro.onboarded.v1` — `"1"` once onboarding completes.
- `soundpro.history.v2` — last 10 recordings (id, date, time, avg/peak/min, duration, mode, readings[]).
- `soundpro.eq.custom.v1` — last 10 custom EQ presets `{name, bands[]}`.

### Mocked / deferred to Phase 2
- Microphone is **simulated** (Phase 1 explicit choice). `start()` generates dB samples every 130 ms; sensitivity & weighting modify amplitude.
- "Enable Microphone" button on onboarding is UI-only.
- Calibration is a 3-second fake.
- Apple Health, real mic, LEQ/TWA, reference calibration, noise/tinnitus generators are Phase 2.

### No backend
All state local. FastAPI server remains untouched.
