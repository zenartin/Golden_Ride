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
  StatusBar,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography } from "../../../theme";
import { useRideStore } from "../../../store/rideStore";
import { useAppStore } from "../../../store/appStore";

export default function ChatDetailScreen({ navigation, route }: any) {
  const rideId = route?.params?.rideId;
  const isSupport = rideId === "support" || !rideId;

  // Store bindings
  const { messages, fetchMessages, sendMessage, activeRide, history, fetchRideHistory } = useRideStore();
  const { supportMessages, fetchSupportMessages, sendSupportMessage } = useAppStore();

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    fetchRideHistory(); // load history to know if the ride is completed/cancelled

    // Poll for new messages every 4 seconds
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [rideId]);

  const loadMessages = async () => {
    try {
      if (isSupport) {
        await fetchSupportMessages();
      } else {
        await fetchMessages(Number(rideId));
      }
    } catch (err) {
      console.log("Chat messages loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");
    Keyboard.dismiss();
    let success = false;
    if (isSupport) {
      success = await sendSupportMessage(text);
    } else {
      success = await sendMessage(Number(rideId), text);
    }
    if (success) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Check if chat is disabled for ended ride
  const matchedRide = activeRide?.id === Number(rideId)
    ? activeRide
    : history.find((r) => r.id === Number(rideId));

  const isChatDisabled =
    !isSupport &&
    matchedRide &&
    ["completed", "cancelled", "declined", "expired"].includes(matchedRide.status);

  const activeMessages = isSupport ? supportMessages : messages;
  const title = isSupport ? "Support Desk" : `Passenger Chat`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>
            {isSupport
              ? "Online Support Team"
              : isChatDisabled
              ? "Chat disabled - Ride ended"
              : "Active Passenger Chat"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {loading ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={activeMessages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              // sender = "driver" means sent by "me"
              const isMe = item.sender === "driver";
              return (
                <View style={[styles.messageBubbleWrap, isMe ? styles.myBubbleWrap : styles.otherBubbleWrap]}>
                  <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                      {item.content}
                    </Text>
                  </View>
                  <Text style={styles.timestamp}>{item.created_at?.slice(11, 16) ?? "Now"}</Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No messages yet. Send a message to start.</Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
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
  centerLoader: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
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
  headerSubtitle: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  messageList: { padding: Spacing.lg, gap: 12 },
  messageBubbleWrap: { maxWidth: "75%", marginBottom: 4 },
  myBubbleWrap: { alignSelf: "flex-end", alignItems: "flex-end" },
  otherBubbleWrap: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderRadius: 18, paddingVertical: 10, paddingHorizontal: 16 },
  myBubble: { backgroundColor: Colors.primary },
  otherBubble: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.divider },
  messageText: { fontSize: Typography.body, lineHeight: 20 },
  myMessageText: { color: Colors.white },
  otherMessageText: { color: Colors.textPrimary },
  timestamp: { fontSize: 9, color: Colors.textMuted, marginTop: 4, marginHorizontal: 6 },
  emptyContainer: { alignItems: "center", paddingVertical: 100, gap: 12 },
  emptyText: { fontSize: Typography.caption, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 40 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.surface,
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
