import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { colors, fonts } from "./theme";

type Props = {
  size?: number;
  value: number;
  max: number;
  color: string;
  unit: string;
  status: string;
  statusColor: string;
  subText?: string;
};

// 270° arc gauge with eased value smoothing.
export default function CircularGauge({
  size = 200,
  value,
  max,
  color,
  unit,
  status,
  statusColor,
  subText,
}: Props) {
  const stroke = 12;
  const r = size / 2 - stroke;
  const cx = size / 2;
  const cy = size / 2;

  // Smoothed displayed value
  const [displayed, setDisplayed] = useState(value);
  const fromRef = useRef(value);
  const toRef = useRef(value);

  useEffect(() => {
    fromRef.current = displayed;
    toRef.current = value;
    const startTime = Date.now();
    const duration = 350;
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (toRef.current - fromRef.current) * eased;
      setDisplayed(next);
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const arcDeg = 270;
  const circumference = 2 * Math.PI * r;
  const visibleLength = (arcDeg / 360) * circumference;
  const hiddenLength = circumference - visibleLength;

  const pct = Math.max(0, Math.min(1, displayed / max));
  const progressLen = visibleLength * pct;
  const rotation = -225;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="rgba(255,255,255,0.045)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${visibleLength} ${hiddenLength}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />

        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${progressLen} ${circumference - progressLen}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text
          testID="gauge-value"
          style={[styles.bigNumber, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {Math.round(displayed)}
        </Text>
        <Text style={styles.unit}>{unit}</Text>
        <Text style={[styles.status, { color: statusColor }]} numberOfLines={1}>
          {status}
        </Text>
        {subText ? (
          <Text style={styles.sub} numberOfLines={1}>{subText}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  bigNumber: {
    fontSize: 52,
    fontWeight: "800",
    fontFamily: fonts.display,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1.5,
  },
  unit: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1.8,
    marginTop: -4,
  },
  status: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  sub: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.8,
  },
});
