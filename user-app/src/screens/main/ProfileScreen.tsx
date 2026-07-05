import React from "react";
import { Alert, Text, View, StyleSheet } from "react-native";

import AppButton from "../../components/AppButton";
import { MainStackParamList } from "../../navigation/MainNavigator";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";

type Props = {
  navigation: {
    navigate: (screen: keyof MainStackParamList) => void;
  };
};

export default function ProfileScreen({ navigation }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const signOut = async () => {
    await logout();
    Alert.alert("Signed out", "Your session has been cleared.");
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Profile</Text>
        <Text style={styles.name}>{user?.name || "Rider"}</Text>
        <Text style={styles.meta}>{user?.email || "user@goldenride.com"}</Text>
        <Text style={styles.meta}>{user?.phone || "0000000000"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.meta}>Profile, wallet, ride booking, active ride, history, details, and cancel APIs are available from the backend UI screen.</Text>
      </View>

      <AppButton title="Open backend API UI" onPress={() => navigation.navigate("ApiConsole")} />
      <AppButton title="Logout" onPress={signOut} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  kicker: { color: Colors.primary, fontSize: Typography.caption, fontWeight: "800", textTransform: "uppercase" },
  name: { color: Colors.textPrimary, fontSize: Typography.heading, fontWeight: "900" },
  meta: { color: Colors.textSecondary, fontSize: Typography.body, lineHeight: 20 },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.subHeading, fontWeight: "800" },
});
