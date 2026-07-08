import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
  Share,
  Linking,
  Alert,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import * as StoreReview from "expo-store-review";
import * as MailComposer from "expo-mail-composer";

import { colors, radius } from "./theme";
import * as H from "./haptic";
import PolicyModal from "./PolicyModal";
import { PRIVACY_POLICY_TITLE, PRIVACY_POLICY_BODY, TERMS_OF_USE_TITLE, TERMS_OF_USE_BODY } from "./policies";
import { startMetering, stopMetering, setMicOffset } from "./mic";
import { useSettings, updateSettings } from "./settings-store";

const SUPPORT_EMAIL = "info@ttbinternationalllc.com";

const LABEL: any = { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 };

type Props = { visible: boolean; onClose: () => void };

export default function SettingsSheet({ visible, onClose }: Props) {
  const [calibrating, setCalibrating] = useState<"idle" | "going" | "done" | "failed">("idle");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const settings = useSettings();

  // Records ~3s of ambient audio and derives a calibration offset assuming a
  // quiet room (~35 dB SPL) — the best we can do without a reference meter.
  const calibrate = async () => {
    H.tap();
    setCalibrating("going");
    const samples: number[] = [];
    const ok = await startMetering((dbfs) => samples.push(dbfs));
    if (!ok) {
      setCalibrating("failed");
      Alert.alert("Microphone access needed", "Enable microphone access in Settings to calibrate.");
      setTimeout(() => setCalibrating("idle"), 2000);
      return;
    }
    setTimeout(async () => {
      await stopMetering();
      if (samples.length > 0) {
        const avgDbfs = samples.reduce((a, b) => a + b, 0) / samples.length;
        await setMicOffset(35 - avgDbfs);
      }
      H.success();
      setCalibrating("done");
      setTimeout(() => setCalibrating("idle"), 2500);
    }, 3000);
  };

  const rateApp = async () => {
    H.tap();
    if (await StoreReview.isAvailableAsync()) {
      StoreReview.requestReview();
    }
  };

  const shareApp = async () => {
    H.tap();
    try {
      await Share.share({ message: "Check out Sound Pro — a sound meter, equalizer & volume booster app." });
    } catch { /* user cancelled */ }
  };

  const contactUs = async () => {
    H.tap();
    if (await MailComposer.isAvailableAsync()) {
      await MailComposer.composeAsync({ recipients: [SUPPORT_EMAIL], subject: "Sound Pro Support" });
    } else {
      Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
        Alert.alert("Contact Us", SUPPORT_EMAIL);
      });
    }
  };

  const openAbout = (id: string) => {
    if (id === "rate") return rateApp();
    if (id === "share") return shareApp();
    if (id === "privacy") { H.tap(); setPrivacyOpen(true); return; }
    if (id === "terms") { H.tap(); setTermsOpen(true); return; }
    if (id === "contact") return contactUs();
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
          </View>

          {/* Calibration */}
          <Text style={[LABEL, styles.section]}>CALIBRATION</Text>
          <TouchableOpacity
            testID="settings-calibrate"
            onPress={calibrate}
            disabled={calibrating === "going"}
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
                : calibrating === "failed"
                ? "Calibration failed"
                : "Calibrate Microphone"}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.muted, { marginTop: 8 }]}>
            Improves accuracy. Run it in a quiet room.
          </Text>

          {/* Display */}
          <Text style={[LABEL, styles.section]}>DISPLAY</Text>
          <ToggleRow label="Show Frequency" desc="Display dominant Hz on meter" on={settings.showFreq} onToggle={() => { H.select(); updateSettings({ showFreq: !settings.showFreq }); }} testID="settings-show-freq" />
          <ToggleRow label="Haptic Feedback" desc="Subtle taps on interactions" on={settings.haptic} onToggle={() => updateSettings({ haptic: !settings.haptic })} testID="settings-haptic" />
          <ToggleRow label="Keep Screen On" desc="Prevent sleep while measuring" on={settings.keepScreenOn} onToggle={() => { H.select(); updateSettings({ keepScreenOn: !settings.keepScreenOn }); }} testID="settings-keep-on" />

          {/* Alerts */}
          <Text style={[LABEL, styles.section]}>ALERTS</Text>
          <ToggleRow label="Noise Alert" desc="Notify above threshold" on={settings.noiseAlert} onToggle={() => { H.select(); updateSettings({ noiseAlert: !settings.noiseAlert }); }} testID="settings-noise-alert" />
          <View style={styles.row2}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }}>Alert Threshold</Text>
              <Text style={{ color: colors.red, fontWeight: "800", fontSize: 13, fontVariant: ["tabular-nums"] }}>{settings.threshold} dB</Text>
            </View>
            <Slider
              testID="settings-threshold-slider"
              minimumValue={70} maximumValue={100} step={1}
              value={settings.threshold}
              onValueChange={(v) => updateSettings({ threshold: v })}
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
            <TouchableOpacity key={item.id} testID={`settings-${item.id}`} onPress={() => openAbout(item.id)} style={styles.aboutRow}>
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

      <PolicyModal visible={privacyOpen} onClose={() => setPrivacyOpen(false)} title={PRIVACY_POLICY_TITLE} body={PRIVACY_POLICY_BODY} />
      <PolicyModal visible={termsOpen} onClose={() => setTermsOpen(false)} title={TERMS_OF_USE_TITLE} body={TERMS_OF_USE_BODY} />
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
