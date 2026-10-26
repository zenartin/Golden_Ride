import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { Colors, Spacing, Typography } from "../../theme";
import { ContactCard } from "../../components/safety/ContactCard";
import { apiClient as api } from "../../api/client";

interface Contact {
  id: number;
  name: string;
  phone_number: string;
  relationship?: string;
  is_primary: boolean;
}

export const EmergencyContactsScreen = () => {
  const navigation = useNavigation<any>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/safety/contacts");
      setContacts(res.data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName("");
    setPhone("");
    setRelationship("");
    setIsPrimary(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Required Fields", "Name and Phone Number are required.");
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        phone_number: phone.trim(),
        relationship: relationship.trim() || undefined,
        is_primary: isPrimary
      };

      if (editId) {
        await api.patch(`/safety/contacts/${editId}`, payload);
      } else {
        await api.post("/safety/contacts", payload);
      }
      resetForm();
      fetchContacts();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.detail || "Failed to save contact.");
    }
  };

  const handleEdit = (c: Contact) => {
    setEditId(c.id);
    setName(c.name);
    setPhone(c.phone_number);
    setRelationship(c.relationship || "");
    setIsPrimary(c.is_primary);
    setShowForm(true);
  };

  const handleDelete = (c: Contact) => {
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to remove ${c.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/safety/contacts/${c.id}`);
              fetchContacts();
            } catch (e) {
              Alert.alert("Error", "Failed to delete contact.");
            }
          }
        }
      ]
    );
  };

  if (showForm) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={resetForm}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editId ? "Edit Contact" : "Add Contact"}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.formContent}>
          <Text style={styles.label}>Name *</Text>
          <TextInput 
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. John Doe"
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput 
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +1 555-0198"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Relationship (Optional)</Text>
          <TextInput 
            style={styles.input}
            value={relationship}
            onChangeText={setRelationship}
            placeholder="e.g. Spouse, Brother"
          />

          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setIsPrimary(!isPrimary)}
          >
            <View style={[styles.checkbox, isPrimary && styles.checkboxActive]}>
              {isPrimary && <Ionicons name="checkmark" size={14} color={Colors.white} />}
            </View>
            <Text style={styles.checkboxLabel}>Set as Primary Contact</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <TouchableOpacity 
          onPress={() => setShowForm(true)}
          disabled={contacts.length >= 3}
          style={{ opacity: contacts.length >= 3 ? 0.5 : 1 }}
        >
          <Ionicons name="add" size={28} color={Colors.primaryDark} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.info} />
            <Text style={styles.infoText}>
              You can add up to 3 trusted emergency contacts. 
            </Text>
          </View>

          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Contacts Added</Text>
              <Text style={styles.emptyDesc}>Add a trusted person to contact in case of emergency.</Text>
            </View>
          ) : (
            contacts.map(c => (
              <ContactCard 
                key={c.id.toString()} 
                contact={c} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { fontSize: Typography.lg, fontWeight: "700", color: Colors.textPrimary },
  saveBtnText: { color: Colors.primaryDark, fontWeight: "700", fontSize: Typography.md },
  content: { padding: Spacing.md },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  infoBox: {
    flexDirection: "row", backgroundColor: Colors.infoLight, padding: Spacing.md,
    borderRadius: Spacing.md, marginBottom: Spacing.md, alignItems: "center"
  },
  infoText: { color: Colors.info, fontSize: Typography.sm, marginLeft: Spacing.sm, flex: 1 },
  emptyState: { alignItems: "center", marginTop: Spacing.xxl },
  emptyTitle: { fontSize: Typography.lg, fontWeight: "700", color: Colors.textPrimary, marginTop: Spacing.md },
  emptyDesc: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: Spacing.xs, textAlign: "center" },
  formContent: { padding: Spacing.md },
  label: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, fontWeight: "600" },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Spacing.sm, padding: Spacing.md, fontSize: Typography.md,
    marginBottom: Spacing.lg, color: Colors.textPrimary
  },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: Colors.border,
    marginRight: Spacing.sm, justifyContent: "center", alignItems: "center"
  },
  checkboxActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  checkboxLabel: { fontSize: Typography.md, color: Colors.textPrimary }
});
