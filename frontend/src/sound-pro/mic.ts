// Real microphone metering via expo-audio. Converts raw dBFS (roughly -160..0)
// into an approximate SPL dB reading using a stored calibration offset —
// phone mics aren't calibrated instruments, so this is an estimate, not a
// certified measurement.
import { AudioModule, RecordingPresets } from "expo-audio";
import { storage } from "@/src/utils/storage";

const OFFSET_KEY = "soundpro.mic.offset.v1";
const DEFAULT_OFFSET = 94;
const MIN_OFFSET = 60;
const MAX_OFFSET = 120;
const POLL_MS = 120;

let recorder: InstanceType<typeof AudioModule.AudioRecorder> | null = null;
let pollId: ReturnType<typeof setInterval> | null = null;

export async function getMicOffset(): Promise<number> {
  const stored = await storage.getItem<number>(OFFSET_KEY, DEFAULT_OFFSET);
  return stored ?? DEFAULT_OFFSET;
}

export async function setMicOffset(offset: number): Promise<void> {
  const clamped = Math.max(MIN_OFFSET, Math.min(MAX_OFFSET, offset));
  await storage.setItem(OFFSET_KEY, clamped);
}

export function dbfsToSpl(dbfs: number, offset: number): number {
  // dbfs is negative (silence) up to ~0 (loudest the mic can capture).
  const spl = dbfs + offset;
  return Math.max(0, Math.min(120, spl));
}

export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await AudioModule.requestRecordingPermissionsAsync();
  return granted;
}

export async function hasMicPermission(): Promise<boolean> {
  const { granted } = await AudioModule.getRecordingPermissionsAsync();
  return granted;
}

export async function startMetering(onLevel: (dbfs: number) => void): Promise<boolean> {
  if (!(await hasMicPermission())) {
    const granted = await requestMicPermission();
    if (!granted) return false;
  }
  await AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

  const rec = new AudioModule.AudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  await rec.prepareToRecordAsync();
  rec.record();
  recorder = rec;

  pollId = setInterval(() => {
    const status = rec.getStatus();
    if (status.isRecording && typeof status.metering === "number") {
      onLevel(status.metering);
    }
  }, POLL_MS);

  return true;
}

export async function stopMetering(): Promise<void> {
  if (pollId) {
    clearInterval(pollId);
    pollId = null;
  }
  const rec = recorder;
  recorder = null;
  if (!rec) return;
  try {
    await rec.stop();
  } catch {
    // already stopped
  }
  try {
    await AudioModule.setAudioModeAsync({ allowsRecording: false });
  } catch {
    // no-op
  }
}
