import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, LayoutAnimation, UIManager, Platform, Alert } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../theme';
import api, { ENDPOINTS } from '../../api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
}

export default function HelpScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoadingFaqs(true);
      setLoadingTickets(true);
      const [faqRes, ticketRes] = await Promise.all([
        api.get(ENDPOINTS.SUPPORT_FAQS).catch(() => ({ data: [] })),
        api.get(ENDPOINTS.SUPPORT_TICKETS).catch(() => ({ data: [] })),
      ]);
      setFaqs(faqRes.data || []);
      setTickets(ticketRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFaqs(false);
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const filteredFaqs = faqs.filter(faq => faq.question.toLowerCase().includes(searchQuery.toLowerCase()));

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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search help..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Ticket')}>
            <Ionicons name="clipboard-outline" size={28} color={Colors.primary} />
            <Text style={styles.actionText}>Submit Ticket</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Chat support coming soon!')}>
            <Ionicons name="chatbubbles-outline" size={28} color={Colors.primary} />
            <Text style={styles.actionText}>Live Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => Linking.openURL('mailto:support@goldenride.com')}>
            <Ionicons name="mail-outline" size={28} color={Colors.primary} />
            <Text style={styles.actionText}>Email Us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => Linking.openURL('tel:+18005551234')}>
            <Ionicons name="call-outline" size={28} color={Colors.primary} />
            <Text style={styles.actionText}>Call Us</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {loadingFaqs ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.faqList}>
            {filteredFaqs.map(faq => (
              <View key={faq.id} style={styles.faqItem}>
                <TouchableOpacity style={styles.faqQuestionRow} onPress={() => toggleFaq(faq.id)}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Ionicons
                    name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
                {expandedFaq === faq.id && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </View>
            ))}
          </View>
        )}

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

        <View style={styles.contactFooter}>
          <Text style={styles.contactFooterText}>Need more help?</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:support@goldenride.com')}>
            <Text style={styles.contactEmail}>support@goldenride.com</Text>
          </TouchableOpacity>
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.m,
    paddingHorizontal: Spacing.m,
    borderRadius: Radius.s,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: Spacing.s,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: Colors.text,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.m,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: Radius.s,
    alignItems: 'center',
    marginBottom: Spacing.m,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: {
    fontSize: Typography.caption,
    color: Colors.text,
    marginTop: Spacing.s,
    fontWeight: 'bold',
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
  faqList: {
    paddingHorizontal: Spacing.m,
  },
  faqItem: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.s,
    borderRadius: Radius.s,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.m,
  },
  faqQuestion: {
    fontSize: Typography.body,
    color: Colors.text,
    fontWeight: 'bold',
    flex: 1,
    marginRight: Spacing.m,
  },
  faqAnswer: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
    paddingLeft: Spacing.xl,
  },
  ticketList: {
    paddingHorizontal: Spacing.m,
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
  contactFooter: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  contactFooterText: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  contactEmail: {
    fontSize: Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
