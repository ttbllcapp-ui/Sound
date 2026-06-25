import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius } from "./theme";

const LABEL: any = { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 };

type Props = { visible: boolean; onClose: () => void };

export default function SettingsSheet({ visible, onClose }: Props) {
  const [calibrating, setCalibrating] = useState<"idle" | "going" | "done">("idle");
  const [showFreq, setShowFreq] = useState(false);
  const [haptic, setHaptic] = useState(true);
  const [keepScreenOn, setKeepScreenOn] = useState(false);
  const [noiseAlert, setNoiseAlert] = useState(false);
  const [threshold, setThreshold] = useState(85);

  const calibrate = () => {
    setCalibrating("going");
    setTimeout(() => {
      setCalibrating("done");
      setTimeout(() => setCalibrating("idle"), 2500);
    }, 3000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} testID="settings-overlay" />
      <View style={styles.sheet} testID="settings-sheet">
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={{ paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Text style={styles.h1}>SOUND PRO</Text>
          <Text style={styles.muted}>Version 1.0.0</Text>

          {/* Calibration */}
          <Text style={[LABEL, styles.section]}>CALIBRATION</Text>
          <TouchableOpacity
            testID="settings-calibrate"
            onPress={calibrate}
            style={[styles.calBtn, calibrating !== "idle" && { borderColor: colors.green }]}
          >
            <Text style={{ color: colors.green, fontWeight: "700", fontSize: 13 }}>
              {calibrating === "going"
                ? "Calibrating... Place device in quiet area"
                : calibrating === "done"
                ? "✓ Calibrated"
                : "Calibrate Microphone"}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.muted, { marginTop: 6 }]}>
            Improve accuracy by calibrating in a quiet room
          </Text>

          {/* Display */}
          <Text style={[LABEL, styles.section]}>DISPLAY</Text>
          <ToggleRow label="Show Frequency" on={showFreq} onToggle={() => setShowFreq((v) => !v)} testID="settings-show-freq" />
          <ToggleRow label="Haptic Feedback" on={haptic} onToggle={() => setHaptic((v) => !v)} testID="settings-haptic" />
          <ToggleRow label="Keep Screen On" on={keepScreenOn} onToggle={() => setKeepScreenOn((v) => !v)} testID="settings-keep-on" />

          {/* Alerts */}
          <Text style={[LABEL, styles.section]}>ALERTS</Text>
          <ToggleRow label="Noise Alert" on={noiseAlert} onToggle={() => setNoiseAlert((v) => !v)} testID="settings-noise-alert" />
          <View style={styles.row2}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.textPrimary, fontSize: 13 }}>Alert Threshold</Text>
              <Text style={{ color: colors.red, fontWeight: "700", fontSize: 13 }}>{threshold} dB</Text>
            </View>
            <Slider
              testID="settings-threshold-slider"
              minimumValue={70}
              maximumValue={100}
              step={1}
              value={threshold}
              onValueChange={setThreshold}
              minimumTrackTintColor={colors.red}
              maximumTrackTintColor="rgba(255,255,255,0.08)"
              thumbTintColor="#FFFFFF"
            />
          </View>

          {/* Premium */}
          <Text style={[LABEL, styles.section]}>PREMIUM</Text>
          <View style={styles.premium}>
            <Text style={{ fontSize: 24, textAlign: "center" }}>👑</Text>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "800", textAlign: "center", marginTop: 4 }}>
              Go Premium
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "center", marginTop: 2 }}>
              Unlock all features
            </Text>
            <View style={{ marginTop: 14 }}>
              {[
                "Volume Boost up to 500%",
                "10-Band Equalizer",
                "All EQ Presets",
                "Sleep Monitor",
                "Evidence Mode",
                "PDF & CSV Export",
                "No Ads",
              ].map((f) => (
                <Text key={f} style={{ color: colors.textPrimary, fontSize: 12, marginVertical: 2 }}>
                  <Text style={{ color: colors.amber }}>✓</Text>  {f}
                </Text>
              ))}
            </View>
            <TouchableOpacity testID="settings-buy" style={styles.priceBtn}>
              <Text style={{ color: "#1A1A24", fontWeight: "900", fontSize: 14 }}>$19.99/year</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: 6 }}>
              or $2.99/month
            </Text>
            <TouchableOpacity testID="settings-restore">
              <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: 6, textDecorationLine: "underline" }}>
                Restore Purchase
              </Text>
            </TouchableOpacity>
          </View>

          {/* About */}
          <Text style={[LABEL, styles.section]}>ABOUT</Text>
          {[
            { label: "Rate Us", id: "rate" },
            { label: "Share App", id: "share" },
            { label: "Privacy Policy", id: "privacy" },
            { label: "Terms of Use", id: "terms" },
            { label: "Contact Us", id: "contact" },
          ].map((item) => (
            <TouchableOpacity key={item.id} testID={`settings-${item.id}`} style={styles.aboutRow}>
              <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ToggleRow({
  label,
  on,
  onToggle,
  testID,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  testID: string;
}) {
  return (
    <View style={styles.row2}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.textPrimary, fontSize: 13 }}>{label}</Text>
        <TouchableOpacity
          onPress={onToggle}
          testID={testID}
          style={{
            width: 46,
            height: 26,
            borderRadius: 13,
            backgroundColor: on ? colors.green : "rgba(255,255,255,0.08)",
            padding: 3,
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: "#FFF",
              alignSelf: on ? "flex-end" : "flex-start",
            }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "88%",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 14,
  },
  h1: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
  muted: { color: colors.textMuted, fontSize: 11 },
  section: { marginTop: 22, marginBottom: 8 },
  calBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: radius.button,
    paddingVertical: 12,
    alignItems: "center",
  },
  row2: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  premium: {
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.amber,
    backgroundColor: "rgba(255,215,64,0.06)",
  },
  priceBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: radius.button,
    backgroundColor: colors.amber,
    alignItems: "center",
    shadowColor: colors.amber,
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  aboutRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
});
