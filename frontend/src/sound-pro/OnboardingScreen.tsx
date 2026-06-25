import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

import { colors } from "./theme";
import * as H from "./haptic";

const { width: W } = Dimensions.get("window");

type Props = { onDone: () => void };

// 3 cinematic onboarding screens. Last screen kicks the (Phase 2) mic permission
// flow and completes onboarding.
export default function OnboardingScreen({ onDone }: Props) {
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const go = (p: number) => {
    setPage(p);
    scrollRef.current?.scrollTo({ x: p * W, animated: true });
    H.select();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.topBar}>
        <Text style={styles.brand}>SOUND PRO</Text>
        {page < 2 && (
          <TouchableOpacity onPress={onDone} testID="onboarding-skip">
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / W);
          setPage(p);
        }}
        style={{ flex: 1 }}
      >
        <Slide
          accent={colors.green}
          icon="🔊"
          art={<BoostArt />}
          title={"Amplify\neverything."}
          body="Crank up volume, deepen the bass, and step into immersive 8D spatial audio — all from one place."
        />
        <Slide
          accent={colors.purple}
          icon="🎛️"
          art={<EqArt />}
          title={"Tune to\nperfection."}
          body="A studio-grade 10-band equalizer with presets crafted by audio engineers. Or shape your own."
        />
        <Slide
          accent={colors.amber}
          icon="📊"
          art={<MeterArt />}
          title={"Measure\nyour world."}
          body="Track ambient noise in real time. Monitor your sleep environment. Capture timestamped recordings."
        />
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              page === i && { width: 22, backgroundColor: colors.textPrimary },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        {page < 2 ? (
          <TouchableOpacity
            testID="onboarding-next"
            style={styles.cta}
            onPress={() => go(page + 1)}
          >
            <Text style={styles.ctaText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#0B0B12" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="onboarding-enable-mic"
            style={[styles.cta, { backgroundColor: colors.amber, shadowColor: colors.amber }]}
            onPress={() => {
              H.success();
              onDone();
            }}
          >
            <Ionicons name="mic" size={16} color="#1A1A24" />
            <Text style={[styles.ctaText, { marginLeft: 8 }]}>Enable Microphone</Text>
          </TouchableOpacity>
        )}
        {page === 2 && (
          <Text style={styles.micNote}>
            We&apos;ll only listen while you&apos;re actively measuring.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function Slide({
  accent,
  icon,
  art,
  title,
  body,
}: {
  accent: string;
  icon: string;
  art: React.ReactNode;
  title: string;
  body: string;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start();
  }, [fade]);
  return (
    <View style={{ width: W, paddingHorizontal: 28, alignItems: "center" }}>
      <Animated.View
        style={{
          opacity: fade,
          transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          alignItems: "center",
        }}
      >
        <View style={styles.artWrap}>{art}</View>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.title, { color: accent }]}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </Animated.View>
    </View>
  );
}

// ─── Cinematic SVG art per slide ───
function BoostArt() {
  // Pulsing concentric arcs in green
  return (
    <Svg width={220} height={220} viewBox="0 0 220 220">
      <Defs>
        <SvgGradient id="ga" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.green} stopOpacity="0.9" />
          <Stop offset="100%" stopColor={colors.green} stopOpacity="0.1" />
        </SvgGradient>
      </Defs>
      <Circle cx="110" cy="110" r="100" stroke="url(#ga)" strokeWidth="2" fill="none" />
      <Circle cx="110" cy="110" r="78" stroke={colors.green} strokeOpacity="0.5" strokeWidth="1.5" fill="none" />
      <Circle cx="110" cy="110" r="56" stroke={colors.green} strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
      <Circle cx="110" cy="110" r="34" fill={colors.green} fillOpacity="0.18" />
      <Circle cx="110" cy="110" r="14" fill={colors.green} />
    </Svg>
  );
}

function EqArt() {
  // 10 vertical bars at varying heights
  const heights = [60, 80, 110, 95, 70, 85, 120, 100, 75, 55];
  return (
    <Svg width={220} height={220} viewBox="0 0 220 220">
      <Defs>
        <SvgGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.purple} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.blue} stopOpacity="0.4" />
        </SvgGradient>
      </Defs>
      {heights.map((h, i) => (
        <React.Fragment key={i}>
          <Circle cx={20 + i * 20} cy={180 - h + 4} r={4} fill={colors.purple} />
          <Circle cx={20 + i * 20} cy={180} r={3} fill="rgba(255,255,255,0.15)" />
          {/* line */}
          <Circle cx={20 + i * 20} cy={180 - h / 2} r={1.5} fill="url(#pg)" />
        </React.Fragment>
      ))}
      {heights.map((h, i) => (
        <Circle key={`b${i}`} cx={20 + i * 20} cy={180 - h + 4} r={2} fill="white" fillOpacity="0.5" />
      ))}
    </Svg>
  );
}

function MeterArt() {
  // 270° gauge sweeping to ~75%, with center dot
  const cx = 110, cy = 110, r = 88;
  const arcDeg = 270;
  const circumference = 2 * Math.PI * r;
  const visible = (arcDeg / 360) * circumference;
  const progress = visible * 0.72;
  return (
    <Svg width={220} height={220} viewBox="0 0 220 220">
      <Defs>
        <SvgGradient id="amb" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={colors.green} stopOpacity="1" />
          <Stop offset="55%" stopColor={colors.amber} stopOpacity="1" />
          <Stop offset="100%" stopColor={colors.red} stopOpacity="1" />
        </SvgGradient>
      </Defs>
      <Circle
        cx={cx} cy={cy} r={r}
        stroke="rgba(255,255,255,0.06)" strokeWidth={14} fill="none"
        strokeDasharray={`${visible} ${circumference - visible}`}
        strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cy})`}
      />
      <Circle
        cx={cx} cy={cy} r={r}
        stroke="url(#amb)" strokeWidth={14} fill="none"
        strokeDasharray={`${progress} ${circumference - progress}`}
        strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cy})`}
      />
      <Circle cx={cx} cy={cy} r={20} fill={colors.amber} fillOpacity="0.15" />
      <Circle cx={cx} cy={cy} r={8} fill={colors.amber} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.base },
  glow: {
    position: "absolute",
    top: -180,
    left: -100,
    right: -100,
    height: 380,
    borderRadius: 380,
    opacity: 0.08,
    backgroundColor: colors.amber,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 10,
  },
  brand: { color: colors.textPrimary, fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  skip: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  artWrap: { marginTop: 40, marginBottom: 8 },
  icon: { fontSize: 32, marginTop: 6 },
  title: {
    marginTop: 16,
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  body: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  footer: { paddingHorizontal: 28, paddingBottom: 16, alignItems: "center" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 220,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  ctaText: { color: "#0B0B12", fontSize: 14, fontWeight: "800", letterSpacing: 0.5 },
  micNote: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 280,
  },
});
