/**
 * Consolidated theme — all tokens defined inline to avoid Hermes barrel-export
 * temporal dead zone errors (ReferenceError: Property 'X' doesn't exist).
 */
import { moderateScale } from "react-native-size-matters";

export const Colors = {
  // Brand
  primary: "#D4AF37",
  primaryDark: "#B8960C",
  primaryLight: "#FDF3C0",

  secondary: "#1E3A8A",
  secondaryLight: "#3B5FC0",

  // Backgrounds
  background: "#F8F9FA",
  surface: "#FFFFFF",

  // Text
  white: "#FFFFFF",
  black: "#000000",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  // UI
  border: "#E5E7EB",
  divider: "#F3F4F6",

  // Status
  success: "#22C55E",
  successLight: "#DCFCE7",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  error: "#EF4444",
  errorLight: "#FEE2E2",
  info: "#3B82F6",
  infoLight: "#DBEAFE",
};

export const Spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
};

export const Typography = {
  title: moderateScale(30),
  heading: moderateScale(24),
  subHeading: moderateScale(20),
  body: moderateScale(16),
  caption: moderateScale(14),
  small: moderateScale(12),
};