import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Share, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

import { colors, radius, dbColor } from "./theme";
import * as H from "./haptic";

export type Recording = {
  id: string;
  date: string;
  time: string;
  avg: number;
  peak: number;
  min: number;
  duration: number;
  mode: "standard" | "sleep" | "evidence";
  readings: number[];
};

type Props = { rec: Recording | null; onClose: () => void };

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function HistoryDetailModal({ rec, onClose }: Props) {
  if (!rec) return null;

  const onShare = async () => {
    H.tap();
    const msg = `📊 Sound Pro Measurement\n${rec.date} · ${rec.time}\nMode: ${rec.mode}\nDuration: ${fmtDuration(rec.duration)}\nAvg: ${rec.avg} dB · Peak: ${rec.peak} dB · Min: ${rec.min} dB`;
    try {
      if (Platform.OS === "web" && (navigator as any).share) {
        await (navigator as any).share({ title: "Sound Pro", text: msg });
      } else if (Platform.OS !== "web") {
        await Share.share({ message: msg });
      }
    } catch { /* user cancelled */ }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.date}>{rec.date}</Text>
            <Text style={styles.time}>{rec.time} · {fmtDuration(rec.duration)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: modeBg(rec.mode) }]}>
            <Text style={{ color: modeColor(rec.mode), fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
              {rec.mode.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Sparkline */}
        <View style={styles.spark}>
          <Sparkline readings={rec.readings} />
        </View>

        {/* Stats */}
        <View style={styles.statRow}>
          <Stat label="MIN" value={`${rec.min}`} color={colors.green} />
          <Stat label="AVG" value={`${rec.avg}`} color={colors.amber} />
          <Stat label="PEAK" value={`${rec.peak}`} color={colors.red} />
        </View>

        <TouchableOpacity testID="history-detail-share" onPress={onShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={16} color={colors.textPrimary} />
          <Text style={styles.shareText}>Share Summary</Text>
        </TouchableOpacity>

        <TouchableOpacity testID="history-detail-close" onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: "600" }}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statUnit}>dB</Text>
    </View>
  );
}

function Sparkline({ readings }: { readings: number[] }) {
  const W = 320, Hh = 90;
  if (readings.length < 2) {
    return (
      <View style={{ height: Hh, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Not enough data</Text>
      </View>
    );
  }
  const max = 120;
  const stepX = W / (readings.length - 1);
  const points = readings.map((v, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${Hh - (v / max) * Hh}`).join(" ");
  const area = points + ` L ${W} ${Hh} L 0 ${Hh} Z`;
  return (
    <Svg width="100%" height={Hh} viewBox={`0 0 ${W} ${Hh}`} preserveAspectRatio="none">
      <Defs>
        <SvgGradient id="sl" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.amber} stopOpacity="0.55" />
          <Stop offset="100%" stopColor={colors.amber} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path d={area} fill="url(#sl)" />
      <Path d={points} stroke={colors.amber} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

const modeColor = (m: Recording["mode"]) =>
  m === "sleep" ? colors.blue : m === "evidence" ? colors.amber : colors.green;
const modeBg = (m: Recording["mode"]) =>
  m === "sleep"
    ? "rgba(68,138,255,0.15)"
    : m === "evidence"
    ? "rgba(255,215,64,0.15)"
    : "rgba(0,230,118,0.15)";

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.base,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 18 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
  time: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  spark: { marginTop: 18, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 8, overflow: "hidden" },
  statRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  statBox: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  statLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  statValue: { fontSize: 24, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"] },
  statUnit: { color: colors.textMuted, fontSize: 10, fontWeight: "600", marginTop: 2 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.textPrimary,
    borderRadius: radius.button,
    paddingVertical: 14,
    marginTop: 18,
    gap: 8,
  },
  shareText: { color: "#0B0B12", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },
  closeBtn: { alignItems: "center", marginTop: 12, paddingVertical: 8 },
});

// keep dbColor referenced (avoid lint warning)
export const _hsmColors = dbColor;
