import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Share,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import CircularGauge from "./CircularGauge";
import HistoryDetailModal, { Recording } from "./HistoryDetailModal";
import { colors, radius, dbColor, dbStatus } from "./theme";
import { storage } from "@/src/utils/storage";
import * as H from "./haptic";

const LABEL: any = { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 };

type Mode = "standard" | "sleep" | "evidence";
type Sensitivity = "low" | "normal" | "high";
type Weight = "dBA" | "dBC";

const HISTORY_KEY = "soundpro.history.v2";
const SPECTRUM_BANDS = 24;
// Each band's center frequency for "dominant Hz" display (rough log-scale)
const BAND_FREQS = Array.from({ length: SPECTRUM_BANDS }, (_, i) => {
  // 50Hz to 12kHz log-spaced
  const min = Math.log(50), max = Math.log(12000);
  return Math.round(Math.exp(min + ((max - min) * i) / (SPECTRUM_BANDS - 1)));
});

const fmtHz = (hz: number) =>
  hz >= 1000 ? `${(hz / 1000).toFixed(1).replace(/\.0$/, "")} kHz` : `${hz} Hz`;

const fmtDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function MeterTab() {
  const [measuring, setMeasuring] = useState(false);
  const [current, setCurrent] = useState(0);
  const [readings, setReadings] = useState<number[]>([]); // last 40 for chart
  const [allReadings, setAllReadings] = useState<number[]>([]); // full session
  const [spectrum, setSpectrum] = useState<number[]>(Array(SPECTRUM_BANDS).fill(0.05));
  const [dominantBand, setDominantBand] = useState(8);
  const [min, setMin] = useState(0);
  const [avg, setAvg] = useState(0);
  const [peak, setPeak] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<Mode>("standard");
  const [sensitivity, setSensitivity] = useState<Sensitivity>("normal");
  const [weight, setWeight] = useState<Weight>("dBA");
  const [sleepReport, setSleepReport] = useState<{ avg: number; peak: number; events: number } | null>(null);
  const [history, setHistory] = useState<Recording[]>([]);
  const [detail, setDetail] = useState<Recording | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sumRef = useRef(0);
  const countRef = useRef(0);
  // Persistent spectrum smoothing
  const spectrumRef = useRef<number[]>(Array(SPECTRUM_BANDS).fill(0.05));

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem<string>(HISTORY_KEY, "");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setHistory(parsed);
        } catch { /* ignore */ }
      }
    })();
  }, []);

  const persist = (next: Recording[]) => {
    setHistory(next);
    storage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  // Generate a single dB sample (sensitivity / weighting / mode applied)
  const generateReading = () => {
    let v: number;
    if (mode === "sleep") {
      const base = 20 + Math.random() * 35;
      const event = Math.random() > 0.92 ? Math.random() * 30 : 0;
      v = Math.min(120, base + event);
    } else {
      const base = 28 + Math.random() * 52;
      const spike = Math.random() > 0.91 ? Math.random() * 28 : 0;
      v = Math.min(120, base + spike);
    }
    if (sensitivity === "low") v *= 0.85;
    if (sensitivity === "high") v *= 1.12;
    if (weight === "dBC") v *= 1.04;
    return Math.min(120, Math.max(0, v));
  };

  // Generate spectrum: bias toward a randomly drifting dominant band
  const generateSpectrum = (dB: number) => {
    const intensity = dB / 100;
    // Drift dominant band each tick
    const drift = (Math.random() - 0.5) * 3;
    setDominantBand((prev) => Math.max(2, Math.min(SPECTRUM_BANDS - 3, Math.round(prev + drift))));
    const center = dominantBand;
    const next = spectrumRef.current.map((prev, i) => {
      // Gaussian-ish profile centered on `center`
      const dist = Math.abs(i - center);
      const profile = Math.exp(-(dist * dist) / 30);
      // Add some randomness so it looks lively
      const target = profile * (0.5 + Math.random() * 0.6) * (0.4 + intensity * 0.9);
      // Smooth toward target
      return prev * 0.55 + target * 0.45;
    });
    spectrumRef.current = next;
    setSpectrum([...next]);
  };

  const start = () => {
    H.heavy();
    setMeasuring(true);
    setCurrent(0);
    setReadings([]);
    setAllReadings([]);
    setMin(0); setAvg(0); setPeak(0); setDuration(0);
    setSleepReport(null);
    sumRef.current = 0;
    countRef.current = 0;

    tickRef.current = setInterval(() => {
      const v = generateReading();
      setCurrent(v);
      sumRef.current += v;
      countRef.current += 1;
      setAvg(sumRef.current / countRef.current);
      setMin((prev) => (countRef.current === 1 ? v : Math.min(prev, v)));
      setPeak((prev) => Math.max(prev, v));
      setReadings((prev) => {
        const next = [...prev, v];
        return next.length > 40 ? next.slice(next.length - 40) : next;
      });
      setAllReadings((prev) => [...prev, v]);
      generateSpectrum(v);
    }, 130);
    secRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stop = () => {
    H.tap();
    setMeasuring(false);
    if (tickRef.current) clearInterval(tickRef.current);
    if (secRef.current) clearInterval(secRef.current);
    tickRef.current = null;
    secRef.current = null;
    spectrumRef.current = Array(SPECTRUM_BANDS).fill(0.05);
    setSpectrum(Array(SPECTRUM_BANDS).fill(0.05));
    if (countRef.current === 0) return;

    if (mode === "sleep") {
      const events = allReadings.filter((r) => r > 60).length;
      setSleepReport({ avg, peak, events });
    }

    const now = new Date();
    // Downsample readings to max 120 for storage
    const compact = allReadings.length > 120
      ? sample(allReadings, 120)
      : allReadings.slice();
    const rec: Recording = {
      id: `${now.getTime()}`,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      avg: Math.round(avg),
      peak: Math.round(peak),
      min: Math.round(min),
      duration,
      mode,
      readings: compact,
    };
    persist([rec, ...history].slice(0, 10));
  };

  const reset = () => {
    H.select();
    if (measuring) stop();
    setCurrent(0);
    setReadings([]);
    setAllReadings([]);
    setMin(0); setAvg(0); setPeak(0); setDuration(0);
    setSleepReport(null);
    spectrumRef.current = Array(SPECTRUM_BANDS).fill(0.05);
    setSpectrum(Array(SPECTRUM_BANDS).fill(0.05));
    sumRef.current = 0;
    countRef.current = 0;
  };

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (secRef.current) clearInterval(secRef.current);
    };
  }, []);

  const gColor = dbColor(current);
  const status = current === 0 && !measuring ? "Ready" : dbStatus(current);
  const subText = measuring ? `${fmtHz(BAND_FREQS[dominantBand])} dominant` : undefined;

  const recPulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (measuring && mode === "evidence") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(recPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(recPulse, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [measuring, mode, recPulse]);

  const showWeightInfo = () =>
    Alert.alert("Weighting", "dBA simulates human hearing response. dBC is flat across all frequencies.");

  const shareSummary = async () => {
    H.tap();
    if (countRef.current === 0 && !history.length) {
      Alert.alert("No data", "Start a measurement first.");
      return;
    }
    const ref: Recording | null = history[0] ?? null;
    const text = ref
      ? `📊 Sound Pro Measurement\n${ref.date} · ${ref.time}\nMode: ${ref.mode}\nDuration: ${fmtDuration(ref.duration)}\nAvg: ${ref.avg} dB · Peak: ${ref.peak} dB · Min: ${ref.min} dB`
      : `📊 Sound Pro\nLive — Current ${Math.round(current)} dB · Avg ${Math.round(avg)} dB · Peak ${Math.round(peak)} dB`;
    try {
      if (Platform.OS === "web" && (navigator as any).share) {
        await (navigator as any).share({ title: "Sound Pro", text });
      } else if (Platform.OS !== "web") {
        await Share.share({ message: text });
      } else {
        Alert.alert("Sound Pro", text);
      }
    } catch { /* user cancelled */ }
  };

  const longPressDelete = (rec: Recording) => {
    H.warn();
    Alert.alert("Delete recording?", `${rec.date} · ${rec.time}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => persist(history.filter((r) => r.id !== rec.id)) },
    ]);
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 40 }} testID="meter-tab">
      <View style={{ alignItems: "center", marginTop: 4 }}>
        <CircularGauge
          value={current}
          max={120}
          color={gColor}
          unit="dB"
          status={status}
          statusColor={gColor}
          subText={subText}
        />
      </View>

      {/* Duration */}
      {measuring && (
        <Text testID="meter-duration" style={styles.duration}>{fmtDuration(duration)}</Text>
      )}

      {/* Spectrum analyzer */}
      <View style={styles.spectrumWrap} testID="meter-spectrum">
        {spectrum.map((v, i) => {
          const h = Math.max(2, v * 60);
          const col = dbColor(Math.min(120, v * 120));
          return (
            <View
              key={i}
              style={{
                flex: 1,
                marginHorizontal: 1,
                height: h,
                borderTopLeftRadius: 1.5,
                borderTopRightRadius: 1.5,
                backgroundColor: col,
                opacity: 0.4 + v * 0.6,
              }}
            />
          );
        })}
      </View>
      <View style={styles.spectrumScale}>
        <Text style={styles.scaleText}>50</Text>
        <Text style={styles.scaleText}>500</Text>
        <Text style={styles.scaleText}>2k</Text>
        <Text style={styles.scaleText}>12k Hz</Text>
      </View>

      {/* Stats */}
      <View style={[styles.row, { marginTop: 14 }]}>
        <Stat label="MIN" value={Math.round(min)} testID="stat-min" />
        <Stat label="AVG" value={Math.round(avg)} testID="stat-avg" />
        <Stat label="PEAK" value={Math.round(peak)} testID="stat-peak" />
      </View>

      {/* Bar chart */}
      <View style={styles.chart} testID="meter-chart">
        {readings.length === 0 ? (
          <Text style={styles.chartEmpty}>Tap the microphone button to start measuring</Text>
        ) : (
          readings.map((r, i) => {
            const opacity = 0.35 + (i / Math.max(1, readings.length - 1)) * 0.65;
            const h = (r / 120) * 56;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  marginHorizontal: 1,
                  height: Math.max(2, h),
                  borderTopLeftRadius: 1.5,
                  borderTopRightRadius: 1.5,
                  backgroundColor: dbColor(r),
                  opacity,
                }}
              />
            );
          })
        )}
      </View>

      {/* Reference grid */}
      <View style={styles.refGrid}>
        <RefItem dot={colors.green} range="0–50 dB" status="Safe" />
        <RefItem dot={colors.amber} range="50–70 dB" status="Normal" />
        <RefItem dot={colors.orange} range="70–85 dB" status="Caution" />
        <RefItem dot={colors.red} range="85+ dB" status="Risk" />
      </View>

      {/* Mode */}
      <Text style={[LABEL, { marginTop: 18, marginBottom: 8, marginLeft: 4 }]}>MODE</Text>
      <View style={styles.row}>
        <ModeCard icon="bar-chart" name="Standard" desc="General" color={colors.green} active={mode === "standard"} onPress={() => { H.select(); setMode("standard"); }} testID="meter-mode-standard" />
        <ModeCard icon="moon" name="Sleep" desc="Overnight" color={colors.blue} active={mode === "sleep"} onPress={() => { H.select(); setMode("sleep"); }} testID="meter-mode-sleep" />
        <ModeCard icon="document-text" name="Evidence" desc="Timestamped" color={colors.amber} active={mode === "evidence"} onPress={() => { H.select(); setMode("evidence"); }} testID="meter-mode-evidence" />
      </View>

      {measuring && mode === "evidence" && (
        <Animated.View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 12, opacity: recPulse }} testID="meter-rec-indicator">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red, marginRight: 8 }} />
          <Text style={{ color: colors.amber, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 }}>
            REC · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </Text>
        </Animated.View>
      )}

      {/* Sensitivity */}
      <Text style={[LABEL, { marginTop: 18, marginBottom: 8, marginLeft: 4 }]}>SENSITIVITY</Text>
      <View style={styles.row}>
        {(["low", "normal", "high"] as const).map((s) => {
          const on = sensitivity === s;
          return (
            <TouchableOpacity
              key={s}
              testID={`meter-sens-${s}`}
              onPress={() => { H.select(); setSensitivity(s); }}
              style={[styles.chipFlex, on && { backgroundColor: colors.green, borderColor: colors.green }]}
            >
              <Text style={[styles.chipText, on && { color: "#0B0B12", fontWeight: "800" }]}>
                {s[0].toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Weighting */}
      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 8, marginLeft: 4 }}>
        <Text style={LABEL}>WEIGHTING</Text>
        <TouchableOpacity testID="meter-weight-info" onPress={showWeightInfo} style={{ marginLeft: 6 }}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        {(["dBA", "dBC"] as const).map((w) => {
          const on = weight === w;
          return (
            <TouchableOpacity
              key={w}
              testID={`meter-weight-${w}`}
              onPress={() => { H.select(); setWeight(w); }}
              style={[styles.chipFlex, on && { backgroundColor: colors.blue, borderColor: colors.blue }]}
            >
              <Text style={[styles.chipText, on && { color: "#FFF", fontWeight: "800" }]}>{w}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Controls */}
      <View style={[styles.row, { marginTop: 18 }]}>
        <TouchableOpacity
          testID={measuring ? "meter-stop" : "meter-start"}
          onPress={measuring ? stop : start}
          style={[
            styles.mainBtn,
            { backgroundColor: measuring ? colors.red : colors.green, shadowColor: measuring ? colors.red : colors.green },
          ]}
        >
          <Ionicons name={measuring ? "stop" : "mic"} size={16} color="#0B0B12" />
          <Text style={styles.mainBtnText}>{measuring ? "STOP" : "START"}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="meter-reset" onPress={reset} style={styles.resetBtn}>
          <Ionicons name="refresh" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Sleep report */}
      {sleepReport && (
        <View style={styles.sleepReport} testID="meter-sleep-report">
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ionicons name="moon" size={16} color={colors.blue} />
            <Text style={{ color: colors.blue, fontWeight: "800", fontSize: 14, marginLeft: 8 }}>Sleep Report</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <SleepStat label="Avg Noise" value={`${Math.round(sleepReport.avg)} dB`} color={colors.textPrimary} />
            <SleepStat label="Peak Event" value={`${Math.round(sleepReport.peak)} dB`} color={colors.textPrimary} />
            <SleepStat
              label="Quality"
              value={sleepReport.avg < 40 ? "Good" : sleepReport.avg < 55 ? "Fair" : "Poor"}
              color={sleepReport.avg < 40 ? colors.green : sleepReport.avg < 55 ? colors.amber : colors.red}
            />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 12 }}>
            Noise Events: <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{sleepReport.events}</Text>
          </Text>
        </View>
      )}

      {/* Share */}
      <TouchableOpacity testID="meter-share" onPress={shareSummary} style={styles.shareRow}>
        <Ionicons name="share-outline" size={16} color={colors.textPrimary} />
        <Text style={{ color: colors.textPrimary, fontWeight: "700", fontSize: 13, marginLeft: 8 }}>
          Share Latest Summary
        </Text>
      </TouchableOpacity>

      {/* History */}
      <Text style={[LABEL, { marginTop: 22, marginBottom: 8, marginLeft: 4 }]}>HISTORY</Text>
      {history.length === 0 ? (
        <Text style={{ color: colors.textMuted, textAlign: "center", paddingVertical: 24, fontSize: 12 }}>
          No recordings yet
        </Text>
      ) : (
        <View>
          {history.map((r) => {
            const icon = r.mode === "sleep" ? "moon" : r.mode === "evidence" ? "document-text" : "bar-chart";
            const iconColor = r.mode === "evidence" ? colors.amber : r.mode === "sleep" ? colors.blue : colors.green;
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => { H.tap(); setDetail(r); }}
                onLongPress={() => longPressDelete(r)}
                delayLongPress={350}
                style={styles.historyCard}
                testID={`history-${r.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "700" }}>
                    {r.date} · {r.time}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10.5, marginTop: 3 }}>
                    Avg: {r.avg} dB · Peak: {r.peak} dB · {fmtDuration(r.duration)}
                  </Text>
                </View>
                <Ionicons name={icon as any} size={16} color={iconColor} />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            testID="meter-clear-history"
            onPress={() => { H.warn(); Alert.alert("Clear history?", "This removes all recordings.", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: () => persist([]) },
            ]); }}
            style={{ alignSelf: "center", marginTop: 8, padding: 8 }}
          >
            <Text style={{ color: colors.red, fontSize: 11, fontWeight: "700" }}>Clear All</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 10, marginTop: 2 }}>
            Tap to view · Long-press to delete
          </Text>
        </View>
      )}

      <HistoryDetailModal rec={detail} onClose={() => setDetail(null)} />
    </View>
  );
}

function sample(arr: number[], n: number): number[] {
  const out: number[] = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

function Stat({ label, value, testID }: { label: string; value: number; testID: string }) {
  return (
    <View style={styles.statCard} testID={testID}>
      <Text style={LABEL}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function RefItem({ dot, range, status }: { dot: string; range: string; status: string }) {
  return (
    <View style={styles.refCard}>
      <View style={[styles.dot, { backgroundColor: dot, shadowColor: dot }]} />
      <View>
        <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: "700" }}>{range}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{status}</Text>
      </View>
    </View>
  );
}

function ModeCard({
  icon, name, desc, color, active, onPress, testID,
}: {
  icon: any; name: string; desc: string; color: string; active: boolean; onPress: () => void; testID: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={[styles.modeCard, active && { backgroundColor: `${color}18`, borderColor: color, shadowColor: color, shadowOpacity: 0.4, shadowRadius: 18 }]}
    >
      <Ionicons name={icon} size={18} color={active ? color : colors.textSecondary} />
      <Text style={{ color: active ? color : colors.textPrimary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>
        {name}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 2, textAlign: "center" }}>
        {desc}
      </Text>
    </TouchableOpacity>
  );
}

function SleepStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color, fontSize: 18, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  duration: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Menlo",
    fontVariant: ["tabular-nums"],
  },
  spectrumWrap: {
    marginTop: 14,
    height: 64,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
  },
  spectrumScale: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginTop: 4,
  },
  scaleText: { color: colors.textMuted, fontSize: 9, fontWeight: "600" },
  row: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  statValue: {
    color: colors.textPrimary, fontSize: 20, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"],
  },
  chart: {
    marginTop: 12, height: 70,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 8,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "center",
  },
  chartEmpty: { color: colors.textMuted, fontSize: 11, textAlign: "center", flex: 1, alignSelf: "center" },
  refGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, gap: 8 },
  refCard: {
    width: "48%", flexGrow: 1,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", gap: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5, shadowOpacity: 0.8, shadowRadius: 6 },
  chipFlex: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.chip, paddingVertical: 10, alignItems: "center",
  },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  modeCard: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, alignItems: "center",
    shadowOffset: { width: 0, height: 0 },
  },
  mainBtn: {
    flex: 1, paddingVertical: 16, borderRadius: radius.button, alignItems: "center",
    flexDirection: "row", justifyContent: "center", gap: 8,
    shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
  },
  mainBtnText: { color: "#0B0B12", fontSize: 14, fontWeight: "900", letterSpacing: 1.5 },
  resetBtn: {
    width: 54, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.borderStrong, borderRadius: radius.button,
    alignItems: "center", justifyContent: "center",
  },
  sleepReport: {
    marginTop: 16, padding: 14, borderRadius: radius.card,
    backgroundColor: "rgba(68,138,255,0.10)", borderWidth: 1, borderColor: colors.blue,
  },
  shareRow: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.button, paddingVertical: 14,
    flexDirection: "row", justifyContent: "center", alignItems: "center",
  },
  historyCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 6,
  },
});
