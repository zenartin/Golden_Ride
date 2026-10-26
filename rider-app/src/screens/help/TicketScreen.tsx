import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['Billing', 'Driver Issue', 'App Problem', 'Lost Item', 'Other'];

type RouteParams = {
  params?: {
    subject?: string;
  };
};

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
}

export default function TicketScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'params'>>();
  
  const [subject, setSubject] = useState(route.params?.subject || '');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const fetchTickets = async () => {
    try {
      setLoadingTickets(true);
      const res = await api.get(ENDPOINTS.SUPPORT_TICKETS);
      setTickets(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async () => {
    if (description.length < 20) {
      Alert.alert('Error', 'Description must be at least 20 characters long.');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(ENDPOINTS.SUPPORT_TICKET_CREATE, {
        subject,
        category,
        description,
      });
      Alert.alert('Success', 'Your ticket has been submitted.');
      setSubject('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      fetchTickets();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return Colors.primary;
      case 'in_progress': return '#4A90E2';
      case 'resolved': return '#2ECC71';
      case 'closed': return Colors.textMuted;
      default: return Colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit a Ticket</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief summary of the issue"
            placeholderTextColor={Colors.textMuted}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Description</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Please describe the issue in detail..."
              placeholderTextColor={Colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Ticket</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>My Tickets</Text>
        {loadingTickets ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : tickets.length === 0 ? (
          <Text style={styles.emptyText}>No support tickets yet.</Text>
        ) : (
          <View style={styles.ticketList}>
            {tickets.map(ticket => (
              <View key={ticket.id} style={styles.ticketItem}>
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                  <Text style={styles.ticketDate}>{new Date(ticket.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: getStatusColor(ticket.status) }]}>
                  <Text style={styles.statusText}>{ticket.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.h3,
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: Spacing.m,
  },
  label: {
    fontSize: Typography.body,
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
    marginTop: Spacing.m,
  },
  input: {
    height: 50,
    backgroundColor: Colors.surface,
    borderRadius: Radius.s,
    paddingHorizontal: Spacing.m,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginVertical: Spacing.xs,
  },
  categoryChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: Radius.pill,
    marginRight: Spacing.s,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryText: {
    color: Colors.text,
    fontSize: Typography.caption,
  },
  categoryTextSelected: {
    color: Colors.background,
    fontWeight: 'bold',
  },
  textAreaContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.s,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 120,
    padding: Spacing.s,
  },
  textArea: {
    flex: 1,
    color: Colors.text,
  },
  charCount: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Radius.s,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitButtonText: {
    fontSize: Typography.button,
    color: Colors.background,
  },
  sectionTitle: {
    fontSize: Typography.h4,
    color: Colors.text,
    marginHorizontal: Spacing.m,
    marginTop: Spacing.l,
    marginBottom: Spacing.m,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginVertical: Spacing.xl,
  },
  ticketList: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.xxl,
  },
  ticketItem: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.m,
    borderRadius: Radius.s,
    marginBottom: Spacing.s,
  },
  ticketInfo: {
    flex: 1,
    marginRight: Spacing.m,
  },
  ticketSubject: {
    fontSize: Typography.body,
    color: Colors.text,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ticketDate: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
  },
  statusChip: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statusText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
});
