import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import VerticalSlider from "./VerticalSlider";
import { colors, radius } from "./theme";
import { storage } from "@/src/utils/storage";
import * as H from "./haptic";

const LABEL: any = { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 };
const FREQ_LABELS = ["32Hz", "64Hz", "125Hz", "250Hz", "500Hz", "1k", "2k", "4k", "8k", "16k"];

const PRESETS: Record<string, number[]> = {
  Flat: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
  Bass: [92, 85, 75, 60, 50, 48, 45, 42, 40, 38],
  Treble: [35, 38, 40, 42, 48, 55, 65, 78, 88, 95],
  Vocal: [35, 40, 50, 65, 80, 85, 75, 60, 45, 35],
  Rock: [80, 72, 55, 42, 50, 60, 70, 78, 75, 70],
  Pop: [42, 50, 60, 68, 75, 72, 65, 58, 55, 48],
  "Lo-Fi": [70, 65, 55, 60, 45, 42, 48, 55, 40, 35],
  Gaming: [75, 70, 50, 45, 55, 65, 72, 80, 78, 72],
  Podcast: [30, 35, 45, 60, 80, 85, 78, 55, 40, 30],
  Sleep: [60, 55, 50, 45, 40, 38, 35, 30, 28, 25],
};
const PRESET_NAMES = Object.keys(PRESETS);

const CUSTOM_KEY = "soundpro.eq.custom.v1";

type Custom = { name: string; bands: number[] };

export default function EqTab() {
  const [bands, setBands] = useState<number[]>(PRESETS.Flat);
  const [active, setActive] = useState<string | null>("Flat");
  const [customs, setCustoms] = useState<Custom[]>([]);
  const [showSave, setShowSave] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [viz, setViz] = useState<number[]>(Array.from({ length: 24 }, () => 0.3));

  useEffect(() => {
    (async () => {
      const raw = await storage.getItem<string>(CUSTOM_KEY, "");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setCustoms(parsed);
        } catch { /* ignore */ }
      }
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const arr = Array.from({ length: 24 }, (_, i) => {
        const band = Math.floor((i / 24) * 10);
        const base = bands[band] / 100;
        const jitter = 0.4 + Math.random() * 0.6;
        return Math.max(0.08, Math.min(1, base * jitter));
      });
      setViz(arr);
    }, 120);
    return () => clearInterval(id);
  }, [bands]);

  const persistCustoms = (next: Custom[]) => {
    setCustoms(next);
    storage.setItem(CUSTOM_KEY, JSON.stringify(next));
  };

  const apply = (name: string, values?: number[]) => {
    H.select();
    setActive(name);
    setBands([...(values ?? PRESETS[name])]);
  };

  const update = (idx: number, v: number) => {
    setActive(null);
    const next = bands.slice();
    next[idx] = v;
    setBands(next);
  };

  const openSave = () => {
    H.tap();
    setPresetName("");
    setShowSave(true);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      Alert.alert("Name required", "Give your preset a name first.");
      return;
    }
    // dedupe: replace if same name
    const next = [{ name, bands: bands.slice() }, ...customs.filter((c) => c.name !== name)].slice(0, 10);
    persistCustoms(next);
    setActive(name);
    setShowSave(false);
    H.success();
  };

  const deleteCustom = (name: string) => {
    H.warn();
    Alert.alert("Delete preset?", `Remove "${name}"`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        persistCustoms(customs.filter((c) => c.name !== name));
        if (active === name) setActive(null);
      } },
    ]);
  };

  const bass = Math.round((bands[0] + bands[1] + bands[2]) / 3);
  const mid = Math.round((bands[3] + bands[4] + bands[5] + bands[6]) / 4);
  const treble = Math.round((bands[7] + bands[8] + bands[9]) / 3);

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 32 }} testID="eq-tab">
      {/* Visualizer */}
      <View style={styles.viz}>
        {viz.map((v, i) => (
          <View
            key={i}
            style={{
              width: 6,
              height: Math.max(2, v * 50),
              backgroundColor: colors.purple,
              opacity: 0.4 + v * 0.6,
              borderRadius: 2,
            }}
          />
        ))}
      </View>

      {/* Presets */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 16, gap: 8 }}
        style={{ marginTop: 12, marginHorizontal: -16 }}
      >
        {PRESET_NAMES.map((p) => {
          const on = active === p;
          return (
            <TouchableOpacity
              key={p}
              testID={`eq-preset-${p}`}
              onPress={() => apply(p)}
              style={[
                styles.presetChip,
                on && {
                  backgroundColor: colors.purple, borderColor: colors.purple,
                  shadowColor: colors.purple, shadowOpacity: 0.5, shadowRadius: 16,
                },
              ]}
            >
              <Text style={[styles.presetText, on && { color: "#FFF", fontWeight: "800" }]}>{p}</Text>
            </TouchableOpacity>
          );
        })}
        {customs.map((c) => {
          const on = active === c.name;
          return (
            <TouchableOpacity
              key={`c_${c.name}`}
              testID={`eq-custom-${c.name}`}
              onPress={() => apply(c.name, c.bands)}
              onLongPress={() => deleteCustom(c.name)}
              delayLongPress={350}
              style={[
                styles.presetChip,
                { borderColor: colors.amber },
                on && {
                  backgroundColor: colors.amber, borderColor: colors.amber,
                  shadowColor: colors.amber, shadowOpacity: 0.5, shadowRadius: 16,
                },
              ]}
            >
              <Ionicons name="star" size={10} color={on ? "#0B0B12" : colors.amber} />
              <Text style={[styles.presetText, { marginLeft: 5 }, on && { color: "#0B0B12", fontWeight: "800" }]}>{c.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 10-band */}
      <View style={styles.eqCard}>
        {bands.map((b, i) => (
          <View key={i} style={styles.band} testID={`eq-band-${i}`}>
            <Text style={styles.bandValue}>{b}</Text>
            <VerticalSlider
              value={b}
              onChange={(v) => update(i, v)}
              height={130}
              trackColor="rgba(124,77,255,0.15)"
              fillColor={colors.purple}
              testID={`eq-slider-${i}`}
            />
            <Text style={styles.bandFreq}>{FREQ_LABELS[i]}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={[styles.row, { marginTop: 14 }]}>
        <Summary label="BASS" value={bass} color={colors.purple} />
        <Summary label="MID" value={mid} color={colors.blue} />
        <Summary label="TREBLE" value={treble} color={colors.cyan} />
      </View>

      <TouchableOpacity
        testID="eq-save-preset"
        onPress={openSave}
        style={[styles.saveBtn, { borderColor: colors.purple, backgroundColor: "rgba(124,77,255,0.10)" }]}
      >
        <Ionicons name="save-outline" size={14} color={colors.purple} />
        <Text style={{ color: colors.purple, fontWeight: "800", fontSize: 13, letterSpacing: 1, marginLeft: 8 }}>
          Save as Custom Preset
        </Text>
      </TouchableOpacity>

      {customs.length > 0 && (
        <Text style={{ color: colors.textMuted, textAlign: "center", fontSize: 10, marginTop: 8 }}>
          Long-press a ⭐ custom preset to delete
        </Text>
      )}

      {/* Save modal */}
      <Modal visible={showSave} transparent animationType="fade" onRequestClose={() => setShowSave(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSave(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Name your preset</Text>
          <TextInput
            testID="eq-preset-name-input"
            value={presetName}
            onChangeText={setPresetName}
            placeholder="My Custom Sound"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
            maxLength={24}
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={() => setShowSave(false)} style={[styles.modalBtn, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="eq-preset-save-confirm" onPress={savePreset} style={[styles.modalBtn, { backgroundColor: colors.purple }]}>
              <Text style={{ color: "#FFF", fontWeight: "800" }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.summary, { backgroundColor: `${color}15`, borderColor: `${color}33` }]}>
      <Text style={[LABEL, { color }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  viz: {
    height: 50,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginTop: 8,
  },
  presetChip: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.chip,
    paddingHorizontal: 14, paddingVertical: 9,
    flexDirection: "row", alignItems: "center",
  },
  presetText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  eqCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border,
    height: 220,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 12,
    marginTop: 14,
  },
  band: { alignItems: "center", flex: 1, justifyContent: "space-between" },
  bandValue: { color: colors.purple, fontWeight: "800", fontSize: 11, fontVariant: ["tabular-nums"] },
  bandFreq: { color: colors.textMuted, fontSize: 7, fontWeight: "700", letterSpacing: 0.5 },
  row: { flexDirection: "row", gap: 10 },
  summary: { flex: 1, borderRadius: radius.card, borderWidth: 1, padding: 12, alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"] },
  saveBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: radius.button,
    alignItems: "center", borderWidth: 1, flexDirection: "row", justifyContent: "center",
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  modalSheet: {
    position: "absolute", left: 24, right: 24, top: "30%",
    backgroundColor: colors.elevated, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  modalTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: "800" },
  input: {
    marginTop: 14, backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong,
    paddingHorizontal: 14, paddingVertical: 12,
    color: colors.textPrimary, fontSize: 14,
  },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: "center" },
});
