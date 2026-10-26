import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, Typography } from "../../../theme";
import { EmergencyCallButton } from "../../../components/safety/EmergencyCallButton";
import { ShareLocationButton } from "../../../components/safety/ShareLocationButton";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export const SafetyHubScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety Hub</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.mainHeading}>Your safety is our priority</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Services</Text>
          <Text style={styles.sectionDesc}>Contact emergency services immediately.</Text>
          <EmergencyCallButton />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <Text style={styles.sectionDesc}>Call a trusted person and share your location.</Text>
          
          <TouchableOpacity 
            style={styles.contactsBtn}
            onPress={() => navigation.navigate("EmergencyContacts")}
          >
            <View style={styles.contactsIcon}>
              <Ionicons name="people" size={20} color={Colors.textPrimary} />
            </View>
            <Text style={styles.contactsBtnText}>Manage Emergency Contacts</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          
          <ShareLocationButton />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    padding: Spacing.md,
  },
  mainHeading: {
    fontSize: Typography.xl,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionDesc: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  contactsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  contactsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.divider,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  contactsBtnText: {
    flex: 1,
    fontSize: Typography.md,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});
