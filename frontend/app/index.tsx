import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/src/sound-pro/theme";
import BoostTab from "@/src/sound-pro/BoostTab";
import EqTab from "@/src/sound-pro/EqTab";
import MeterTab from "@/src/sound-pro/MeterTab";
import SettingsSheet from "@/src/sound-pro/SettingsSheet";
import OnboardingScreen from "@/src/sound-pro/OnboardingScreen";
import { storage } from "@/src/utils/storage";
import * as H from "@/src/sound-pro/haptic";

type Tab = "boost" | "eq" | "meter";

const TAB_GLOW: Record<Tab, string> = {
  boost: colors.green,
  eq: colors.purple,
  meter: colors.amber,
};

const ONBOARDED_KEY = "soundpro.onboarded.v1";

export default function Index() {
  const [tab, setTab] = useState<Tab>("boost");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onboardChecked, setOnboardChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      const done = await storage.getItem<string>(ONBOARDED_KEY, "");
      setNeedsOnboarding(done !== "1");
      setOnboardChecked(true);
    })();
  }, []);

  const finishOnboarding = () => {
    storage.setItem(ONBOARDED_KEY, "1");
    setNeedsOnboarding(false);
  };

  if (!onboardChecked) {
    return <View style={{ flex: 1, backgroundColor: colors.base }} />;
  }

  if (needsOnboarding) {
    return <OnboardingScreen onDone={finishOnboarding} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <StatusBar style="light" />

      <View pointerEvents="none" style={[styles.glow, { backgroundColor: TAB_GLOW[tab] }]} />
      <View pointerEvents="none" style={[styles.glowDeep, { backgroundColor: TAB_GLOW[tab] }]} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SOUND PRO</Text>
          <Text style={styles.tagline}>BOOST · EQUALIZE · MEASURE</Text>
        </View>
        <TouchableOpacity
          testID="open-settings"
          onPress={() => { H.tap(); setSettingsOpen(true); }}
          style={styles.gear}
        >
          <Ionicons name="settings-outline" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TabBtn id="boost" tab={tab} setTab={setTab} icon="volume-high" label="Boost" />
        <TabBtn id="eq" tab={tab} setTab={setTab} icon="options" label="EQ" />
        <TabBtn id="meter" tab={tab} setTab={setTab} icon="speedometer" label="Meter" />
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8 }}
      >
        {tab === "boost" && <BoostTab />}
        {tab === "eq" && <EqTab />}
        {tab === "meter" && <MeterTab />}
      </ScrollView>

      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </SafeAreaView>
  );
}

function TabBtn({
  id, tab, setTab, icon, label,
}: { id: Tab; tab: Tab; setTab: (t: Tab) => void; icon: any; label: string }) {
  const active = tab === id;
  return (
    <TouchableOpacity
      testID={`tab-${id}`}
      onPress={() => { if (!active) H.select(); setTab(id); }}
      style={[styles.tabBtn, active && { backgroundColor: colors.elevated, borderColor: "rgba(255,255,255,0.05)" }]}
    >
      <Ionicons
        name={icon}
        size={active ? 22 : 19}
        color={active ? colors.textPrimary : colors.textMuted}
      />
      <Text style={[styles.tabLabel, active && { color: colors.textPrimary, fontWeight: "800" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
  glow: {
    position: "absolute",
    top: -160, left: -100, right: -100, height: 360,
    borderRadius: 360, opacity: 0.075,
  },
  glowDeep: {
    position: "absolute",
    top: 200, left: -150, right: -150, height: 280,
    borderRadius: 280, opacity: 0.04,
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12,
  },
  title: { color: colors.textPrimary, fontSize: 19, fontWeight: "900", letterSpacing: 1.5 },
  tagline: { color: colors.textMuted, fontSize: 8, letterSpacing: 2.5, fontWeight: "700", marginTop: 2 },
  gear: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  tabBar: {
    marginHorizontal: 16, flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)",
    padding: 4, gap: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 11,
    alignItems: "center", backgroundColor: "transparent",
    borderWidth: 1, borderColor: "transparent",
  },
  tabLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 4, letterSpacing: 0.5 },
});
