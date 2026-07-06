import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRideStore, RideStatus } from "../../store/rideStore";
import { Colors, Spacing, Typography } from "../../theme";

export default function ChatScreen({ navigation, route }: any) {
  const rideId = Number(route?.params?.rideId);
  const { chatMessages, fetchMessages, sendMessage, fetchTripDetail } = useRideStore();
  
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [rideStatus, setRideStatus] = useState<RideStatus>("searching");
  const flatListRef = useRef<FlatList<any>>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchMessages(rideId);
        const details = await fetchTripDetail(String(rideId));
        if (details) {
          setRideStatus(details.status);
        }
      } catch (err) {
        console.log("Load chat error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
    
    // Poll for new messages every 4 seconds when chat is open
    const interval = setInterval(async () => {
      try {
        await fetchMessages(rideId);
        const details = await fetchTripDetail(String(rideId));
        if (details) {
          setRideStatus(details.status);
        }
      } catch (e) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [rideId]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");
    Keyboard.dismiss();
    const success = await sendMessage(rideId, text);
    if (success) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const isChatDisabled = ["completed", "cancelled"].includes(rideStatus);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Ride Chat</Text>
          <Text style={styles.headerSubtitle}>
            {isChatDisabled ? "Chat disabled - Ride ended" : "Active chat with driver"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerLoader}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            // "rider" corresponds to "me" in user-app, "driver" corresponds to "other"
            const isMe = item.sender === "rider";
            return (
              <View style={[styles.messageWrap, isMe ? styles.myWrap : styles.otherWrap]}>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                  <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>
                    {item.content}
                  </Text>
                </View>
                <Text style={styles.timestamp}>{item.created_at?.slice(11, 16) ?? "Now"}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                No messages yet. Send a message to coordinate pickup with your driver.
              </Text>
            </View>
          }
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={styles.inputBarWrapper}
      >
        <View style={[styles.inputBar, isChatDisabled && styles.inputBarDisabled]}>
          <TextInput
            style={[styles.textInput, isChatDisabled && styles.textInputDisabled]}
            placeholder={isChatDisabled ? "Chat is disabled - ride has ended" : "Type a message..."}
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            editable={!isChatDisabled}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (isChatDisabled || !inputText.trim()) && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={isChatDisabled || !inputText.trim()}
          >
            <Ionicons name="send" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerInfo: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: Typography.body, fontWeight: "800", color: Colors.textPrimary },
  headerSubtitle: { fontSize: Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  centerLoader: { flex: 1, alignItems: "center", justifyContent: "center" },
  messageList: { padding: Spacing.lg, gap: 12 },
  messageWrap: { maxWidth: "75%", marginBottom: 10 },
  myWrap: { alignSelf: "flex-end", alignItems: "flex-end" },
  otherWrap: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  myBubble: { backgroundColor: Colors.primary },
  otherBubble: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  messageText: { fontSize: Typography.body, lineHeight: 20 },
  myText: { color: Colors.white },
  otherText: { color: Colors.textPrimary },
  timestamp: { fontSize: 10, color: Colors.textMuted, marginTop: 4, marginHorizontal: 4 },
  emptyContainer: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.caption, textAlign: "center", paddingHorizontal: 24 },
  inputBarWrapper: { backgroundColor: Colors.surface },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  inputBarDisabled: { opacity: 0.6, backgroundColor: Colors.background },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    fontSize: Typography.body,
    color: Colors.textPrimary,
  },
  textInputDisabled: { color: Colors.textSecondary },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: Colors.textMuted },
});
