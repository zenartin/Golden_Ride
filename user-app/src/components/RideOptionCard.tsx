import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../store/authStore";
import { Colors, Spacing, Typography } from "../theme";
import { RideOption } from "../store/rideStore";

// Maps each ride class id to a specific vehicle icon + badge
const VEHICLE_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    badge?: string;
    badgeColor?: string;
    accentColor: string;
    bgColor: string;
  }
> = {
  hatchback: {
    icon: null, // filled below
    badge: "Budget Pick",
    badgeColor: "#16A34A",
    accentColor: "#16A34A",
    bgColor: "#F0FDF4",
  },
  sedan: {
    icon: null,
    badge: "Most Popular",
    badgeColor: "#D97706",
    accentColor: Colors.primary,
    bgColor: "#FFFBEB",
  },
  xuv: {
    icon: null,
    badge: "Premium Space",
    badgeColor: "#7C3AED",
    accentColor: "#7C3AED",
    bgColor: "#F5F3FF",
  },
};

function VehicleIcon({ id, selected, size = 30 }: { id: string; selected: boolean; size?: number }) {
  if (id === "hatchback") {
    return (
      <MaterialCommunityIcons
        name="car-hatchback"
        size={size}
        color={selected ? "#fff" : "#16A34A"}
      />
    );
  }
  if (id === "sedan") {
    return (
      <MaterialCommunityIcons
        name="car-back"
        size={size}
        color={selected ? "#fff" : Colors.primary}
      />
    );
  }
  if (id === "xuv") {
    return (
      <MaterialCommunityIcons
        name="car-estate"
        size={size}
        color={selected ? "#fff" : "#7C3AED"}
      />
    );
  }
  // Fallback
  return <Ionicons name="car-outline" size={size} color={selected ? "#fff" : Colors.primary} />;
}

export default function RideOptionCard({
  option,
  selected,
  onPress,
}: {
  option: RideOption;
  selected?: boolean;
  onPress: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const symbol = user?.country === "USA" ? "$" : "₹";
  
  const config = VEHICLE_CONFIG[option.id] ?? {
    badge: undefined,
    badgeColor: Colors.primary,
    accentColor: Colors.primary,
    bgColor: Colors.surface,
  };

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        selected && { borderColor: config.accentColor, borderWidth: 2, backgroundColor: config.bgColor },
      ]}
    >
      {/* Top row: icon + name + badge + price */}
      <View style={styles.topRow}>
        {/* Vehicle icon bubble */}
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: selected ? config.accentColor : config.accentColor + "1A" },
          ]}
        >
          <VehicleIcon id={option.id} selected={!!selected} size={26} />
        </View>

        {/* Name + subtitle */}
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={[styles.title, selected && { color: config.accentColor }, { flexShrink: 1 }]} numberOfLines={1}>
              {option.title}
            </Text>
            {config.badge && (
              <View style={[styles.badge, { backgroundColor: config.badgeColor + "20" }]}>
                <Text style={[styles.badgeText, { color: config.badgeColor }]}>{config.badge}</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {option.subtitle}
          </Text>
        </View>

        {/* Price */}
        <Text style={[styles.price, selected && { color: config.accentColor }]}>
          {symbol}{Number(option.price).toFixed(2)}
        </Text>
      </View>

      {/* Bottom row: ETA + distance + seats + AC indicator */}
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{option.eta}</Text>
        </View>
        {option.distance && (
          <View style={styles.metaChip}>
            <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.metaText}>
              {user?.country === "USA"
                ? `${(parseFloat(option.distance) * 0.621371).toFixed(1)} mi`
                : option.distance}
            </Text>
          </View>
        )}
        <View style={styles.metaChip}>
          <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{option.seats} seats</Text>
        </View>
        {/* AC badge for sedan & XUV */}
        {/* AC badge for cars */}
        <View style={styles.metaChip}>
          <Ionicons name="snow-outline" size={13} color="#3B82F6" />
          <Text style={[styles.metaText, { color: "#3B82F6" }]}>AC</Text>
        </View>
        {/* Cash accepted chip */}
        <View style={styles.metaChip}>
          <Ionicons name="cash-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>Cash</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nameBlock: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.body,
    fontWeight: "800",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.caption,
  },
  price: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
});
