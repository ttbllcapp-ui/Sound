import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { colors, fonts } from "./theme";

/**
 * 270° arc gauge (open at bottom).
 * - size: outer diameter
 * - value: current value
 * - max: range upper bound
 * - color: progress stroke color
 * - centerNumber: text shown big in center
 * - unit: small label below number
 * - status: status line below unit (e.g. "SAFE")
 * - statusColor: status text color
 */
type Props = {
  size?: number;
  value: number;
  max: number;
  color: string;
  centerNumber: string;
  unit: string;
  status: string;
  statusColor: string;
};

export default function CircularGauge({
  size = 190,
  value,
  max,
  color,
  centerNumber,
  unit,
  status,
  statusColor,
}: Props) {
  const stroke = 10;
  const r = size / 2 - stroke;
  const cx = size / 2;
  const cy = size / 2;

  // 270 degrees of arc, starting at 135deg (bottom-left) going clockwise to 45deg (bottom-right).
  const arcDeg = 270;
  const circumference = 2 * Math.PI * r;
  const visibleLength = (arcDeg / 360) * circumference;
  const hiddenLength = circumference - visibleLength;

  const pct = Math.max(0, Math.min(1, value / max));
  const progressLen = visibleLength * pct;

  // Rotate so the gap is centered at the bottom.
  // Default stroke starts at 3 o'clock; we rotate by -225° so the start of the arc is at 7:30 (bottom-left).
  const rotation = -225;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${visibleLength} ${hiddenLength}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />

        {/* Progress track */}
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
          {centerNumber}
        </Text>
        <Text style={styles.unit}>{unit}</Text>
        <Text style={[styles.status, { color: statusColor }]} numberOfLines={1}>
          {status}
        </Text>
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
    fontSize: 44,
    fontWeight: "800",
    fontFamily: fonts.display,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  unit: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginTop: -2,
  },
  status: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
