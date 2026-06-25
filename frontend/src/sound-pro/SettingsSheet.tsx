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
import * as H from "./haptic";

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
    H.tap();
    setCalibrating("going");
    setTimeout(() => {
      H.success();
      setCalibrating("done");
      setTimeout(() => setCalibrating("idle"), 2500);
    }, 3000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} testID="settings-overlay" />
      <View style={styles.sheet} testID="settings-sheet">
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.h1}>SOUND PRO</Text>
              <Text style={styles.muted}>Version 1.0.0</Text>
            </View>
            <View style={styles.freeBadge}>
              <Ionicons name="heart" size={11} color={colors.green} />
              <Text style={{ color: colors.green, fontSize: 10, fontWeight: "800", letterSpacing: 1, marginLeft: 5 }}>
                100% FREE
              </Text>
            </View>
          </View>

          {/* Free pitch */}
          <View style={styles.freeCard}>
            <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "700" }}>
              Every feature is free. Forever.
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
              No subscriptions, no paywalls, no locked tools. Sound Pro is built by audio enthusiasts who believe great tools should be accessible to everyone.
            </Text>
          </View>

          {/* Calibration */}
          <Text style={[LABEL, styles.section]}>CALIBRATION</Text>
          <TouchableOpacity
            testID="settings-calibrate"
            onPress={calibrate}
            style={[styles.calBtn, calibrating !== "idle" && { borderColor: colors.green }]}
          >
            <Ionicons
              name={calibrating === "done" ? "checkmark-circle" : "mic-outline"}
              size={16}
              color={colors.green}
            />
            <Text style={{ color: colors.green, fontWeight: "700", fontSize: 13, marginLeft: 8 }}>
              {calibrating === "going"
                ? "Calibrating… stay quiet"
                : calibrating === "done"
                ? "Calibrated"
                : "Calibrate Microphone"}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.muted, { marginTop: 8 }]}>
            Improves accuracy. Run it in a quiet room.
          </Text>

          {/* Display */}
          <Text style={[LABEL, styles.section]}>DISPLAY</Text>
          <ToggleRow label="Show Frequency" desc="Display dominant Hz on meter" on={showFreq} onToggle={() => { H.select(); setShowFreq((v) => !v); }} testID="settings-show-freq" />
          <ToggleRow label="Haptic Feedback" desc="Subtle taps on interactions" on={haptic} onToggle={() => { H.select(); setHaptic((v) => !v); }} testID="settings-haptic" />
          <ToggleRow label="Keep Screen On" desc="Prevent sleep while measuring" on={keepScreenOn} onToggle={() => { H.select(); setKeepScreenOn((v) => !v); }} testID="settings-keep-on" />

          {/* Alerts */}
          <Text style={[LABEL, styles.section]}>ALERTS</Text>
          <ToggleRow label="Noise Alert" desc="Notify above threshold" on={noiseAlert} onToggle={() => { H.select(); setNoiseAlert((v) => !v); }} testID="settings-noise-alert" />
          <View style={styles.row2}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Alert Threshold</Text>
              <Text style={{ color: colors.red, fontWeight: "800", fontSize: 13, fontVariant: ["tabular-nums"] }}>{threshold} dB</Text>
            </View>
            <Slider
              testID="settings-threshold-slider"
              minimumValue={70} maximumValue={100} step={1}
              value={threshold}
              onValueChange={setThreshold}
              minimumTrackTintColor={colors.red}
              maximumTrackTintColor="rgba(255,255,255,0.08)"
              thumbTintColor="#FFFFFF"
              style={{ marginTop: 4 }}
            />
          </View>

          {/* About */}
          <Text style={[LABEL, styles.section]}>ABOUT</Text>
          {[
            { label: "Rate Us", id: "rate", icon: "star-outline" },
            { label: "Share App", id: "share", icon: "share-outline" },
            { label: "Privacy Policy", id: "privacy", icon: "shield-checkmark-outline" },
            { label: "Terms of Use", id: "terms", icon: "document-text-outline" },
            { label: "Contact Us", id: "contact", icon: "mail-outline" },
          ].map((item) => (
            <TouchableOpacity key={item.id} testID={`settings-${item.id}`} onPress={() => H.tap()} style={styles.aboutRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name={item.icon as any} size={16} color={colors.textSecondary} />
                <Text style={{ color: colors.textPrimary, fontSize: 13, marginLeft: 10 }}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}

          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 28, lineHeight: 18 }}>
            Made with care by audio enthusiasts.{"\n"}Crank it up. 🎧
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ToggleRow({
  label, desc, on, onToggle, testID,
}: { label: string; desc?: string; on: boolean; onToggle: () => void; testID: string }) {
  return (
    <View style={styles.row2}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{label}</Text>
          {desc && <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{desc}</Text>}
        </View>
        <TouchableOpacity
          onPress={onToggle}
          testID={testID}
          style={{
            width: 46, height: 26, borderRadius: 13,
            backgroundColor: on ? colors.green : "rgba(255,255,255,0.08)",
            padding: 3, justifyContent: "center",
            marginLeft: 12,
          }}
        >
          <View
            style={{
              width: 20, height: 20, borderRadius: 10,
              backgroundColor: "#FFF", alignSelf: on ? "flex-end" : "flex-start",
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
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.base,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 10,
    maxHeight: "88%",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center", marginBottom: 16,
  },
  h1: { color: colors.textPrimary, fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  muted: { color: colors.textMuted, fontSize: 11 },
  section: { marginTop: 22, marginBottom: 8 },
  freeBadge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: "rgba(0,230,118,0.10)",
    borderRadius: 8,
    borderWidth: 1, borderColor: "rgba(0,230,118,0.3)",
  },
  freeCard: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.card,
    padding: 14,
  },
  calBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.green,
    borderRadius: radius.button,
    paddingVertical: 13,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
  },
  row2: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 14, marginBottom: 8,
  },
  aboutRow: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 6,
  },
});
