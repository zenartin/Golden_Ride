import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../../types/navigation";
import { Colors, Spacing, Typography } from "../../../theme";

type Props = NativeStackScreenProps<any, "Welcome">;

const { height } = Dimensions.get("window");

const FEATURES = [
  { icon: "flash" as const, label: "Instant Rides", desc: "Get matched with riders in seconds" },
  { icon: "cash" as const, label: "Daily Earnings", desc: "Track and withdraw anytime" },
  { icon: "shield-checkmark" as const, label: "Safe & Insured", desc: "Drive with full coverage" },
];

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Hero */}
      <LinearGradient
        colors={["#FDF3C0", "#FFFFFF"]}
        style={styles.hero}
      >
        <Image
          source={require("../../../../assets/images/logo.jpeg")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>Golden Ride</Text>
        <Text style={styles.tagline}>Your premium ride-earning platform</Text>
      </LinearGradient>

      {/* Feature pills */}
      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <View style={styles.iconCircle}>
              <Ionicons name={f.icon} size={20} color={Colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate("PersonalInfo")}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>Create Driver Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  hero: {
    alignItems: "center",
    paddingTop: 64,
    paddingBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: 16,
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.primary,
  },
  tagline: {
    marginTop: 8,
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  features: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: Spacing.md,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  featureLabel: {
    fontSize: Typography.body,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  featureDesc: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cta: {
    padding: Spacing.lg,
    gap: 12,
  },
  btnPrimary: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimaryText: {
    color: Colors.white,
    fontSize: Typography.body,
    fontWeight: "700",
  },
  btnSecondary: {
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    color: Colors.primary,
    fontSize: Typography.body,
    fontWeight: "700",
  },
});
