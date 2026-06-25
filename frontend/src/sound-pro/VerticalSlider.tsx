import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from "react-native";

import { colors } from "./theme";

type Props = {
  value: number;          // 0-100
  onChange: (v: number) => void;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  testID?: string;
};

// Vertical slider built from PanResponder; works on web + native + Expo Go.
export default function VerticalSlider({
  value,
  onChange,
  height = 140,
  trackColor = "rgba(124,77,255,0.15)",
  fillColor = colors.purple,
  testID,
}: Props) {
  const [h, setH] = useState(height);
  const sliderRef = useRef<View>(null);

  const update = (gestureY: number, layoutY: number) => {
    const local = gestureY - layoutY;
    // Map so top = 100, bottom = 0.
    const ratio = 1 - local / h;
    const next = Math.round(Math.max(0, Math.min(100, ratio * 100)));
    onChange(next);
  };

  const layoutYRef = useRef(0);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        update(evt.nativeEvent.pageY, layoutYRef.current);
      },
      onPanResponderMove: (evt) => {
        update(evt.nativeEvent.pageY, layoutYRef.current);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    setH(e.nativeEvent.layout.height);
    sliderRef.current?.measure?.((_, __, ___, ____, _____, py) => {
      layoutYRef.current = py;
    });
  };

  const fillH = (value / 100) * h;

  return (
    <View
      ref={sliderRef}
      style={[styles.track, { height, backgroundColor: trackColor }]}
      onLayout={onLayout}
      testID={testID}
      {...responder.panHandlers}
    >
      <View
        style={[
          styles.fill,
          { height: fillH, backgroundColor: fillColor, shadowColor: fillColor },
        ]}
      />
      <View
        style={[
          styles.thumb,
          { bottom: Math.max(0, fillH - 6), backgroundColor: fillColor, shadowColor: fillColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 6,
    borderRadius: 3,
    alignSelf: "center",
    position: "relative",
    overflow: "visible",
  },
  fill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 3,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  thumb: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    left: -5,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});

// Marker to indicate this is the unused import safe value (avoids tree-shaking issues during dev).
export const _vsliderColors = colors;
