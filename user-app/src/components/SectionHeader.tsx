import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Colors, Typography } from "../theme";

export default function SectionHeader({
  title,
  actionLabel,
  onPress,
}: {
  title: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onPress ? (
        <Pressable onPress={onPress}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: Colors.textPrimary, fontSize: Typography.subHeading, fontWeight: "800" },
  action: { color: Colors.primary, fontWeight: "700", fontSize: Typography.caption },
});
