import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { MainStackParamList } from "../../navigation/MainNavigator";
import { Colors, Spacing, Typography } from "../../theme";
import { apiRequest } from "../../api/client";

type ContentScreenRouteProp = RouteProp<MainStackParamList, 'Content'>;

export default function ContentScreen() {
  const navigation = useNavigation();
  const route = useRoute<ContentScreenRouteProp>();
  const { slug, title } = route.params;

  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await apiRequest<{ content: string }>(`/content/${slug}`);
        setContent(response.content);
      } catch (err) {
        setError("Failed to load content. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [slug]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={48} color={Colors.warning} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {content?.split('\n').map((line, index) => {
            if (line.startsWith('# ')) {
              return <Text key={index} style={styles.h1}>{line.replace('# ', '')}</Text>;
            } else if (line.startsWith('## ')) {
              return <Text key={index} style={styles.h2}>{line.replace('## ', '')}</Text>;
            } else if (line.startsWith('**') && line.endsWith('**')) {
               return <Text key={index} style={styles.boldText}>{line.replace(/\*\*/g, '')}</Text>;
            } else if (line.trim() === '') {
              return <View key={index} style={styles.spacer} />;
            } else {
               // Quick hack to support inline bold tags for the FAQ and list items
               const parts = line.split(/(\*\*.*?\*\*)/g);
               return (
                 <Text key={index} style={styles.paragraph}>
                   {parts.map((part, i) => {
                     if (part.startsWith('**') && part.endsWith('**')) {
                       return <Text key={i} style={styles.boldTextInline}>{part.replace(/\*\*/g, '')}</Text>;
                     }
                     return part;
                   })}
                 </Text>
               );
            }
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.background,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.textPrimary, letterSpacing: 0.5 },
  scroll: { padding: Spacing.xl, paddingBottom: 80 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  errorText: { color: Colors.textSecondary, marginTop: 12, textAlign: "center", lineHeight: 22 },
  retryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primaryLight, borderRadius: 12 },
  retryText: { color: Colors.primaryDark, fontWeight: "700" },
  
  h1: { fontSize: 26, fontWeight: "900", color: Colors.primaryDark, marginBottom: 16, marginTop: 12, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: "800", color: Colors.textPrimary, marginBottom: 12, marginTop: 28, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8 },
  paragraph: { fontSize: 16, color: Colors.textSecondary, lineHeight: 26, marginBottom: 8, letterSpacing: 0.2 },
  spacer: { height: 12 },
  boldText: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8, marginTop: 4 },
  boldTextInline: { fontWeight: "800", color: Colors.textPrimary },
});
