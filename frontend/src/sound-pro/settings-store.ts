// Tiny shared, persisted settings store so toggles in SettingsSheet actually
// affect behavior elsewhere (haptics, meter display, keep-awake) instead of
// being local, inert component state.
import { useSyncExternalStore } from "react";
import { storage } from "@/src/utils/storage";

export type Settings = {
  haptic: boolean;
  keepScreenOn: boolean;
  showFreq: boolean;
  noiseAlert: boolean;
  threshold: number;
};

const DEFAULTS: Settings = {
  haptic: true,
  keepScreenOn: false,
  showFreq: false,
  noiseAlert: false,
  threshold: 85,
};

const KEY = "soundpro.settings.v1";

let state: Settings = { ...DEFAULTS };
const listeners = new Set<() => void>();

(async () => {
  const raw = await storage.getItem<string>(KEY, "");
  if (raw) {
    try {
      state = { ...DEFAULTS, ...JSON.parse(raw) };
      listeners.forEach((l) => l());
    } catch {
      // ignore corrupt value, keep defaults
    }
  }
})();

export function getSettings(): Settings {
  return state;
}

export function updateSettings(patch: Partial<Settings>): void {
  state = { ...state, ...patch };
  storage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}
