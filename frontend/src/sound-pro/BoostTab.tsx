import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";

import CircularGauge from "./CircularGauge";
import { colors, radius, boostColor, boostStatus } from "./theme";
import * as H from "./haptic";

const LABEL: any = { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 };

type Profile = "music" | "movie" | "podcast" | "night" | null;
type Speaker = "left" | "both" | "right" | null;
type SpinSpeed = "slow" | "medium" | "fast";
type Timer = "off" | "30" | "60" | "90";

export default function BoostTab() {
  const [activeBoost, setActiveBoost] = useState(false);
  const [volume, setVolume] = useState(150);
  const [bass, setBass] = useState(40);
  const [profile, setProfile] = useState<Profile>("music");
  const [eightD, setEightD] = useState(false);
  const [eightDSpeed, setEightDSpeed] = useState<SpinSpeed>("medium");
  const [noiseClean, setNoiseClean] = useState(false);
  const [timer, setTimer] = useState<Timer>("off");
  const [speaker, setSpeaker] = useState<Speaker>(null);

  // Gauge value reflects boost only when active.
  const gaugeVal = activeBoost ? volume : 0;
  const gColor = boostColor(volume, activeBoost);
  const status = boostStatus(volume, activeBoost);

  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!eightD) { spin.stopAnimation(); return; }
    spin.setValue(0);
    const dur = eightDSpeed === "slow" ? 8000 : eightDSpeed === "fast" ? 1500 : 3500;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [eightD, eightDSpeed, spin]);

  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (!speaker) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speaker, pulse]);

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const spinDegRev = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });
  const orbitDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 32 }} testID="boost-tab">
      <View style={{ alignItems: "center", marginTop: 4, marginBottom: 14 }}>
        <CircularGauge
          value={gaugeVal}
          max={500}
          color={gColor}
          unit="%"
          status={status.text}
          statusColor={status.color}
        />
      </View>

      {/* Volume */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={LABEL}>VOLUME BOOST</Text>
          <Text style={styles.valueRight}>{volume}%</Text>
        </View>
        <Slider
          testID="boost-volume-slider"
          minimumValue={0} maximumValue={500} step={1}
          value={volume}
          onValueChange={(v) => setVolume(v)}
          onSlidingComplete={() => H.tap()}
          minimumTrackTintColor={gColor}
          maximumTrackTintColor="rgba(255,255,255,0.08)"
          thumbTintColor="#FFFFFF"
        />
      </View>

      {/* Bass */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={LABEL}>BASS BOOST</Text>
          <Text style={[styles.valueRight, { color: colors.purple }]}>{bass}%</Text>
        </View>
        <Slider
          testID="boost-bass-slider"
          minimumValue={0} maximumValue={100} step={1}
          value={bass}
          onValueChange={(v) => setBass(v)}
          onSlidingComplete={() => H.tap()}
          minimumTrackTintColor={colors.purple}
          maximumTrackTintColor="rgba(255,255,255,0.08)"
          thumbTintColor="#FFFFFF"
        />
      </View>

      {/* Profile */}
      <Text style={[LABEL, { marginTop: 12, marginBottom: 8, marginLeft: 4 }]}>SOUND PROFILE</Text>
      <View style={styles.row}>
        {(["music", "movie", "podcast", "night"] as const).map((p) => {
          const labels: Record<string, string> = { music: "Music", movie: "Movie", podcast: "Podcast", night: "Night" };
          const icons: Record<string, any> = { music: "musical-notes", movie: "film", podcast: "mic", night: "moon" };
          const on = profile === p;
          return (
            <TouchableOpacity
              key={p}
              testID={`boost-profile-${p}`}
              onPress={() => { H.select(); setProfile(on ? null : p); }}
              style={[styles.profileBtn, on && { backgroundColor: "rgba(68,138,255,0.14)", borderColor: colors.blue }]}
            >
              <Ionicons name={icons[p]} size={16} color={on ? colors.blue : colors.textSecondary} />
              <Text style={[styles.profileLabel, on && { color: colors.blue }]}>{labels[p]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 8D */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Animated.View style={{ transform: [{ rotate: eightD ? spinDeg : "0deg" }] }}>
              <Ionicons name="headset" size={22} color={eightD ? colors.blue : colors.textSecondary} />
            </Animated.View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.cardTitle}>8D Audio</Text>
              <Text style={styles.cardSub}>Surround sound experience</Text>
            </View>
          </View>
          <Switch on={eightD} onToggle={() => { H.select(); setEightD((v) => !v); }} color={colors.blue} testID="boost-8d-toggle" />
        </View>

        {eightD && (
          <View style={{ marginTop: 16, alignItems: "center" }}>
            <View style={{ width: 80, height: 80, alignItems: "center", justifyContent: "center" }}>
              <Animated.View style={[styles.dashed, { width: 80, height: 80, transform: [{ rotate: spinDeg }] }]} />
              <Animated.View
                style={[
                  styles.dashed,
                  { position: "absolute", width: 50, height: 50, borderColor: "rgba(68,138,255,0.6)", transform: [{ rotate: spinDegRev }] },
                ]}
              />
              <View style={styles.eightDDot} />
              <Animated.View style={[styles.eightDOrbit, { transform: [{ rotate: orbitDeg }, { translateX: 32 }] }]} />
            </View>
            <View style={[styles.row, { marginTop: 12 }]}>
              {(["slow", "medium", "fast"] as const).map((s) => {
                const on = eightDSpeed === s;
                return (
                  <TouchableOpacity
                    key={s}
                    testID={`boost-8d-${s}`}
                    onPress={() => { H.select(); setEightDSpeed(s); }}
                    style={[styles.chip, on && { backgroundColor: colors.blue, borderColor: colors.blue }]}
                  >
                    <Text style={[styles.chipText, on && { color: "#FFF" }]}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Noise Cleaning */}
      <View style={[styles.card, styles.rowBetween, { marginTop: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="sparkles" size={18} color={noiseClean ? colors.cyan : colors.textSecondary} />
          <Text style={[styles.cardTitle, { marginLeft: 10 }]}>Noise Cleaning</Text>
        </View>
        <Switch on={noiseClean} onToggle={() => { H.select(); setNoiseClean((v) => !v); }} color={colors.cyan} testID="boost-noise-toggle" />
      </View>

      {/* Timer */}
      <Text style={[LABEL, { marginTop: 16, marginBottom: 8, marginLeft: 4 }]}>TIMER</Text>
      <View style={styles.row}>
        {(["off", "30", "60", "90"] as const).map((t) => {
          const on = timer === t;
          const label = t === "off" ? "Off" : `${t}m`;
          return (
            <TouchableOpacity
              key={t}
              testID={`boost-timer-${t}`}
              onPress={() => { H.select(); setTimer(t); }}
              style={[styles.chipFlex, on && { backgroundColor: colors.amber, borderColor: colors.amber }]}
            >
              <Text style={[styles.chipText, on && { color: "#1A1A24", fontWeight: "800" }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Speaker */}
      <Text style={[LABEL, { marginTop: 16, marginBottom: 8, marginLeft: 4 }]}>SPEAKER TEST</Text>
      <View style={styles.row}>
        {(["left", "both", "right"] as const).map((s) => {
          const on = speaker === s;
          const labels = { left: "◀ Left", both: "◀▶ Both", right: "Right ▶" };
          return (
            <TouchableOpacity
              key={s}
              testID={`boost-speaker-${s}`}
              onPress={() => { H.select(); setSpeaker(on ? null : s); }}
              style={[styles.chipFlex, on && { backgroundColor: "rgba(0,230,118,0.14)", borderColor: colors.green }]}
            >
              <Text style={[styles.chipText, on && { color: colors.green, fontWeight: "700" }]}>{labels[s]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {speaker && (
        <Animated.Text style={{ color: colors.green, textAlign: "center", marginTop: 8, opacity: pulse, fontSize: 18 }}>
          ♫
        </Animated.Text>
      )}

      {/* Hearing alert */}
      {activeBoost && volume > 200 && volume <= 350 && (
        <View style={[styles.alert, { backgroundColor: "rgba(255,215,64,0.10)", borderColor: colors.amber }]}>
          <Text style={[styles.alertText, { color: colors.amber }]}>
            ⚠️  Prolonged listening may damage your hearing.
          </Text>
        </View>
      )}
      {activeBoost && volume > 350 && (
        <View style={[styles.alert, { backgroundColor: "rgba(255,23,68,0.12)", borderColor: colors.red }]}>
          <Text style={[styles.alertText, { color: colors.red }]}>
            🛑  Hearing damage risk! Lower the level immediately.
          </Text>
        </View>
      )}

      {/* Activate */}
      <TouchableOpacity
        testID="boost-activate"
        onPress={() => {
          if (!activeBoost) H.heavy(); else H.tap();
          setActiveBoost((v) => !v);
        }}
        style={[
          styles.activate,
          activeBoost
            ? { backgroundColor: gColor, borderColor: gColor, shadowColor: gColor, shadowOpacity: 0.5, shadowRadius: 24 }
            : { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.15)" },
        ]}
      >
        <Text style={[styles.activateText, { color: activeBoost ? "#0B0B12" : colors.textSecondary }]}>
          {activeBoost ? "⚡ BOOSTING" : "ACTIVATE BOOST"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Switch({ on, onToggle, color, testID }: { on: boolean; onToggle: () => void; color: string; testID?: string }) {
  return (
    <TouchableOpacity
      onPress={onToggle} testID={testID} activeOpacity={0.8}
      style={{
        width: 46, height: 26, borderRadius: 13,
        backgroundColor: on ? color : "rgba(255,255,255,0.08)",
        padding: 3, justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 20, height: 20, borderRadius: 10,
          backgroundColor: "#FFF", alignSelf: on ? "flex-end" : "flex-start",
        }}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 10,
  },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: 8 },
  valueRight: { color: colors.textPrimary, fontWeight: "700", fontSize: 13, fontVariant: ["tabular-nums"] },
  cardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
  cardSub: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  profileBtn: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.button,
    borderWidth: 1, borderColor: colors.border, paddingVertical: 12,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6,
  },
  profileLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  chip: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.chip, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipFlex: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.chip, paddingVertical: 10, alignItems: "center",
  },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  dashed: {
    borderRadius: 1000, borderWidth: 1.5,
    borderColor: "rgba(68,138,255,0.45)", borderStyle: "dashed",
  },
  eightDDot: {
    position: "absolute", width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.blue, shadowColor: colors.blue,
    shadowOpacity: 0.8, shadowRadius: 8,
  },
  eightDOrbit: { position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan },
  alert: { marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1 },
  alertText: { fontSize: 12, fontWeight: "600" },
  activate: {
    marginTop: 18, paddingVertical: 16, borderRadius: radius.button,
    alignItems: "center", borderWidth: 1,
  },
  activateText: { fontSize: 14, fontWeight: "800", letterSpacing: 1.5 },
});
