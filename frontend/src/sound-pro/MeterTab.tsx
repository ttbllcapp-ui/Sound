import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import CircularGauge from "./CircularGauge";
import { colors, radius, dbColor, dbStatus } from "./theme";
import { storage } from "@/src/utils/storage";

const LABEL: any = { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 };

type Mode = "standard" | "sleep" | "evidence";
type Sensitivity = "low" | "normal" | "high";
type Weight = "dBA" | "dBC";

type Recording = {
  id: string;
  date: string;
  time: string;
  avg: number;
  peak: number;
  min: number;
  duration: number; // seconds
  mode: Mode;
  readingCount: number;
};

const HISTORY_KEY = "soundpro.history.v1";

export default function MeterTab() {
  const [measuring, setMeasuring] = useState(false);
  const [current, setCurrent] = useState(0);
  const [readings, setReadings] = useState<number[]>([]); // last 40
  const [allReadings, setAllReadings] = useState<number[]>([]); // for avg/peak/min
  const [min, setMin] = useState(0);
  const [avg, setAvg] = useState(0);
  const [peak, setPeak] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<Mode>("standard");
  const [sensitivity, setSensitivity] = useState<Sensitivity>("normal");
  const [weight, setWeight] = useState<Weight>("dBA");
  const [sleepReport, setSleepReport] = useState<{ avg: number; peak: number; events: number } | null>(null);
  const [history, setHistory] = useState<Recording[]>([]);
  const [nowTick, setNowTick] = useState(0); // for evidence timestamp

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sumRef = useRef(0);
  const countRef = useRef(0);

  // Load history on mount
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

  const generateReading = () => {
    let base: number;
    if (mode === "sleep") {
      base = 20 + Math.random() * 35;
      const event = Math.random() > 0.92 ? Math.random() * 30 : 0;
      return Math.min(120, base + event);
    }
    base = 28 + Math.random() * 52;
    const spike = Math.random() > 0.91 ? Math.random() * 28 : 0;
    let v = Math.min(120, base + spike);
    // Sensitivity adjustment
    if (sensitivity === "low") v *= 0.85;
    if (sensitivity === "high") v *= 1.12;
    // Weighting just adds a tiny bias
    if (weight === "dBC") v *= 1.04;
    return Math.min(120, Math.max(0, v));
  };

  const start = () => {
    setMeasuring(true);
    setCurrent(0);
    setReadings([]);
    setAllReadings([]);
    setMin(0);
    setAvg(0);
    setPeak(0);
    setDuration(0);
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
    }, 130);
    secRef.current = setInterval(() => {
      setDuration((d) => d + 1);
      setNowTick((t) => t + 1);
    }, 1000);
  };

  const stop = () => {
    setMeasuring(false);
    if (tickRef.current) clearInterval(tickRef.current);
    if (secRef.current) clearInterval(secRef.current);
    tickRef.current = null;
    secRef.current = null;

    if (countRef.current === 0) return;

    if (mode === "sleep") {
      const events = allReadings.filter((r) => r > 60).length;
      setSleepReport({ avg, peak, events });
    }

    const now = new Date();
    const rec: Recording = {
      id: `${now.getTime()}`,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      avg: Math.round(avg),
      peak: Math.round(peak),
      min: Math.round(min),
      duration,
      mode,
      readingCount: countRef.current,
    };
    persist([rec, ...history].slice(0, 5));
  };

  const reset = () => {
    if (measuring) stop();
    setCurrent(0);
    setReadings([]);
    setAllReadings([]);
    setMin(0);
    setAvg(0);
    setPeak(0);
    setDuration(0);
    setSleepReport(null);
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

  // Pulse for evidence REC indicator
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
    Alert.alert(
      "Weighting",
      "dBA simulates human hearing response. dBC is flat across all frequencies.",
    );

  const onExport = (kind: "pdf" | "csv") => {
    Alert.alert("Premium Feature", "Upgrade to Premium to export reports.");
  };

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const fmtRecTime = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 40 }} testID="meter-tab">
      {/* Gauge */}
      <View style={{ alignItems: "center", marginTop: 8 }}>
        <CircularGauge
          value={current}
          max={120}
          color={gColor}
          centerNumber={current > 0 ? `${Math.round(current)}` : "0"}
          unit="dB"
          status={status}
          statusColor={gColor}
        />
      </View>

      {/* Duration */}
      {measuring && (
        <Text testID="meter-duration" style={styles.duration}>{fmtDuration(duration)}</Text>
      )}

      {/* Stats */}
      <View style={[styles.row, { marginTop: 14 }]}>
        <Stat label="MIN" value={Math.round(min)} testID="stat-min" />
        <Stat label="AVG" value={Math.round(avg)} testID="stat-avg" />
        <Stat label="PEAK" value={Math.round(peak)} testID="stat-peak" />
      </View>

      {/* Bar chart */}
      <View style={styles.chart} testID="meter-chart">
        {readings.length === 0 ? (
          <Text style={styles.chartEmpty}>Tap microphone to start</Text>
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
        <RefItem dot={colors.green} range="0-50 dB" status="Safe" />
        <RefItem dot={colors.amber} range="50-70 dB" status="Normal" />
        <RefItem dot={colors.orange} range="70-85 dB" status="Caution" />
        <RefItem dot={colors.red} range="85+ dB" status="Risk!" />
      </View>

      {/* Mode selector */}
      <Text style={[LABEL, { marginTop: 18, marginBottom: 8, marginLeft: 4 }]}>MEASUREMENT MODE</Text>
      <View style={styles.row}>
        <ModeCard
          icon="bar-chart"
          name="Standard"
          desc="General noise"
          color={colors.green}
          active={mode === "standard"}
          onPress={() => setMode("standard")}
          testID="meter-mode-standard"
        />
        <ModeCard
          icon="moon"
          name="Sleep"
          desc="Overnight"
          color={colors.blue}
          active={mode === "sleep"}
          onPress={() => setMode("sleep")}
          testID="meter-mode-sleep"
        />
        <ModeCard
          icon="document-text"
          name="Evidence"
          desc="Timestamped"
          color={colors.amber}
          active={mode === "evidence"}
          onPress={() => setMode("evidence")}
          testID="meter-mode-evidence"
        />
      </View>

      {measuring && mode === "evidence" && (
        <Animated.Text
          testID="meter-rec-indicator"
          style={{
            color: colors.amber,
            marginTop: 10,
            textAlign: "center",
            opacity: recPulse,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 1.5,
          }}
        >
          ⏺ REC — {fmtRecTime()}
        </Animated.Text>
      )}

      {/* Sensitivity */}
      <Text style={[LABEL, { marginTop: 16, marginBottom: 8, marginLeft: 4 }]}>SENSITIVITY</Text>
      <View style={styles.row}>
        {(["low", "normal", "high"] as const).map((s) => {
          const on = sensitivity === s;
          return (
            <TouchableOpacity
              key={s}
              testID={`meter-sens-${s}`}
              onPress={() => setSensitivity(s)}
              style={[
                styles.chipFlex,
                on && { backgroundColor: colors.green, borderColor: colors.green },
              ]}
            >
              <Text style={[styles.chipText, on && { color: "#FFF", fontWeight: "800" }]}>
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
              onPress={() => setWeight(w)}
              style={[
                styles.chipFlex,
                on && { backgroundColor: colors.blue, borderColor: colors.blue },
              ]}
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
            {
              backgroundColor: measuring ? colors.red : colors.green,
              shadowColor: measuring ? colors.red : colors.green,
            },
          ]}
        >
          <Text style={styles.mainBtnText}>
            {measuring ? "⏹ STOP" : "🎙 START"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="meter-reset"
          onPress={reset}
          style={styles.resetBtn}
        >
          <Ionicons name="refresh" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Sleep report */}
      {sleepReport && (
        <View style={styles.sleepReport} testID="meter-sleep-report">
          <Text style={{ color: colors.blue, fontWeight: "800", fontSize: 14, marginBottom: 10 }}>
            🌙 Sleep Report
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <SleepStat label="Avg Noise" value={`${Math.round(sleepReport.avg)} dB`} color={colors.textPrimary} />
            <SleepStat label="Peak Event" value={`${Math.round(sleepReport.peak)} dB`} color={colors.textPrimary} />
            <SleepStat
              label="Quality"
              value={sleepReport.avg < 40 ? "Good" : sleepReport.avg < 55 ? "Fair" : "Poor"}
              color={sleepReport.avg < 40 ? colors.green : sleepReport.avg < 55 ? colors.amber : colors.red}
            />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 10 }}>
            Noise Events: <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{sleepReport.events}</Text>
          </Text>
        </View>
      )}

      {/* Export */}
      <Text style={[LABEL, { marginTop: 18, marginBottom: 8, marginLeft: 4 }]}>EXPORT</Text>
      <View style={styles.row}>
        <ExportBtn
          color={colors.amber}
          label="📄 Export PDF"
          onPress={() => onExport("pdf")}
          testID="meter-export-pdf"
        />
        <ExportBtn
          color={colors.blue}
          label="📊 Export CSV"
          onPress={() => onExport("csv")}
          testID="meter-export-csv"
        />
      </View>

      {/* History */}
      <Text style={[LABEL, { marginTop: 22, marginBottom: 8, marginLeft: 4 }]}>HISTORY</Text>
      {history.length === 0 ? (
        <Text style={{ color: colors.textMuted, textAlign: "center", paddingVertical: 24, fontSize: 12 }}>
          No recordings yet
        </Text>
      ) : (
        <View>
          {history.map((r) => {
            const icon = r.mode === "sleep" ? "🌙" : r.mode === "evidence" ? "📋" : "📊";
            return (
              <View key={r.id} style={styles.historyCard} testID={`history-${r.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600" }}>
                    {r.date} · {r.time}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 3 }}>
                    Avg: {r.avg} dB · Peak: {r.peak} dB · {fmtDuration(r.duration)}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: r.mode === "evidence" ? colors.amber : colors.textSecondary }}>
                  {icon}
                </Text>
              </View>
            );
          })}
          <TouchableOpacity
            testID="meter-clear-history"
            onPress={() => persist([])}
            style={{ alignSelf: "center", marginTop: 8, padding: 8 }}
          >
            <Text style={{ color: colors.red, fontSize: 11, fontWeight: "600" }}>Clear History</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
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
  icon,
  name,
  desc,
  color,
  active,
  onPress,
  testID,
}: {
  icon: any;
  name: string;
  desc: string;
  color: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      style={[
        styles.modeCard,
        active && {
          backgroundColor: `${color}18`,
          borderColor: color,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={active ? color : colors.textSecondary} />
      <Text
        style={{
          color: active ? color : colors.textPrimary,
          fontSize: 12,
          fontWeight: "700",
          marginTop: 6,
        }}
      >
        {name}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 9,
          marginTop: 2,
          textAlign: "center",
        }}
      >
        {desc}
      </Text>
    </TouchableOpacity>
  );
}

function SleepStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
        {label}
      </Text>
      <Text style={{ color, fontSize: 18, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
    </View>
  );
}

function ExportBtn({
  color,
  label,
  onPress,
  testID,
}: {
  color: string;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      style={[
        styles.exportBtn,
        { borderColor: color, backgroundColor: `${color}12` },
      ]}
    >
      <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{label}</Text>
      <View
        style={{
          backgroundColor: "rgba(255,215,64,0.18)",
          paddingHorizontal: 5,
          paddingVertical: 1,
          borderRadius: 4,
          marginLeft: 6,
        }}
      >
        <Text style={{ color: colors.amber, fontSize: 8, fontWeight: "800" }}>PRO</Text>
      </View>
    </TouchableOpacity>
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
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  chart: {
    marginTop: 12,
    height: 70,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  chartEmpty: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    flex: 1,
    alignSelf: "center",
  },
  refGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  refCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 7,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5, shadowOpacity: 0.8, shadowRadius: 6 },
  chipFlex: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    paddingVertical: 10,
    alignItems: "center",
  },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  modeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  mainBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radius.button,
    alignItems: "center",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  mainBtnText: { color: "#0B0B12", fontSize: 14, fontWeight: "900", letterSpacing: 1.5 },
  resetBtn: {
    width: 54,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  sleepReport: {
    marginTop: 16,
    padding: 14,
    borderRadius: radius.card,
    backgroundColor: "rgba(68,138,255,0.10)",
    borderWidth: 1,
    borderColor: colors.blue,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
});
