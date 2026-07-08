// Tiny haptics wrapper that no-ops on web/unsupported platforms and respects
// the user's "Haptic Feedback" setting.
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { getSettings } from "./settings-store";

const safe = (fn: () => Promise<unknown> | unknown) => {
  if (Platform.OS === "web") return;
  if (!getSettings().haptic) return;
  try { void fn(); } catch { /* swallow */ }
};

export const tap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const select = () => safe(() => Haptics.selectionAsync());
export const success = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const warn = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const heavy = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
