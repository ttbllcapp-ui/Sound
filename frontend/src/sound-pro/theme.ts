// Design tokens for SOUND PRO.

export const colors = {
  base: "#09090F",
  surface: "#111118",
  elevated: "#1A1A24",
  overlay: "#242432",

  textPrimary: "#F0F0F5",
  textSecondary: "#8E8EA0",
  textMuted: "#4A4A5A",

  green: "#00E676",
  lime: "#B2FF59",
  amber: "#FFD740",
  orange: "#FF6E40",
  red: "#FF1744",
  purple: "#7C4DFF",
  blue: "#448AFF",
  cyan: "#18FFFF",

  border: "rgba(255,255,255,0.04)",
  borderStrong: "rgba(255,255,255,0.08)",
};

export const radius = {
  card: 12,
  button: 14,
  chip: 16,
  small: 8,
};

export const fonts = {
  // SF Pro Rounded falls back to system on iOS; system used elsewhere.
  display: "System",
  mono: "Menlo",
};

// Color buckets for boost (volume %) and dB meter.
export const boostColor = (v: number, active: boolean) => {
  if (!active) return colors.textMuted;
  if (v <= 100) return colors.green;
  if (v <= 250) return colors.amber;
  if (v <= 400) return colors.orange;
  return colors.red;
};

export const boostStatus = (v: number, active: boolean) => {
  if (!active) return { text: "OFF", color: colors.textMuted };
  if (v <= 200) return { text: "SAFE", color: colors.green };
  if (v <= 350) return { text: "CAUTION", color: colors.amber };
  return { text: "DANGER", color: colors.red };
};

export const dbColor = (v: number) => {
  if (v < 50) return colors.green;
  if (v < 65) return colors.lime;
  if (v < 80) return colors.amber;
  if (v < 95) return colors.orange;
  return colors.red;
};

export const dbStatus = (v: number) => {
  if (v < 30) return "Silent";
  if (v < 50) return "Whisper";
  if (v < 65) return "Normal";
  if (v < 80) return "Loud";
  if (v < 95) return "Very Loud";
  return "DANGEROUS";
};
