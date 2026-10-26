import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../../theme";
import { callEmergencyContact } from "../../services/safetyService";

interface Contact {
  id: number;
  name: string;
  phone_number: string;
  relationship?: string;
  is_primary: boolean;
}

interface Props {
  contact: Contact;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
  readOnly?: boolean;
}

export const ContactCard = ({ contact, onEdit, onDelete, readOnly = false }: Props) => {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{contact.name}</Text>
            {contact.is_primary && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Primary</Text>
              </View>
            )}
          </View>
          <Text style={styles.phone}>{contact.phone_number}</Text>
          {contact.relationship && (
            <Text style={styles.relationship}>{contact.relationship}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.callBtn]}
          onPress={() => callEmergencyContact(contact.phone_number)}
        >
          <Ionicons name="call" size={18} color={Colors.white} />
          <Text style={styles.callText}>Call</Text>
        </TouchableOpacity>

        {!readOnly && (
          <View style={styles.editActions}>
            {onEdit && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(contact)}>
                <Ionicons name="pencil" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => onDelete(contact)}>
                <Ionicons name="trash" size={20} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.infoLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.info,
    fontSize: Typography.lg,
    fontWeight: "700",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: Typography.md,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
  primaryBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    color: Colors.warning,
    fontSize: Typography.xs,
    fontWeight: "600",
  },
  phone: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  relationship: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Spacing.sm,
  },
  callBtn: {
    backgroundColor: Colors.success,
  },
  callText: {
    color: Colors.white,
    fontWeight: "600",
    marginLeft: Spacing.xs,
  },
  editActions: {
    flexDirection: "row",
  },
  iconBtn: {
    padding: Spacing.sm,
    marginLeft: Spacing.xs,
  }
});
