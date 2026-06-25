import React from "react";
import { View, ViewProps, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";

import { colors, radius } from "./theme";

type Props = ViewProps & {
  intensity?: number;
  tint?: "dark" | "light" | "default";
  rounded?: number;
};

// Cross-platform glass card. On web BlurView falls back gracefully but we
// still get the layered surface look from the inner backdrop.
export default function GlassCard({
  intensity = 30,
  tint = "dark",
  rounded = radius.card,
  style,
  children,
  ...rest
}: Props) {
  // On web, expo-blur uses CSS backdrop-filter which works in Chromium.
  // Either way the inner gradient layer always renders.
  const inner = (
    <View style={[styles.inner, { borderRadius: rounded }, style]} {...rest}>
      {children}
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.webGlass,
          { borderRadius: rounded },
        ]}
      >
        {inner}
      </View>
    );
  }

  return (
    <View style={{ borderRadius: rounded, overflow: "hidden" }}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    backgroundColor: "rgba(20,20,28,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  webGlass: {
    // @ts-ignore RNW exposes backdropFilter
    backdropFilter: "blur(20px) saturate(140%)",
    backgroundColor: "rgba(17,17,24,0.55)",
    borderColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    overflow: "hidden",
  },
});

// keep colors imported (avoid unused warning)
export const _glassColors = colors;
