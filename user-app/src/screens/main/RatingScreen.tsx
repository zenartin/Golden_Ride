import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../../components/AppButton";
import { MainStackParamList } from "../../navigation/MainNavigator";
import { Colors, Spacing, Typography } from "../../theme";
import { apiRequest } from "../../api/client";
import { useRideStore } from "../../store/rideStore";

type Props = NativeStackScreenProps<MainStackParamList, "Rating">;

export default function RatingScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Please provide a rating", "Tap the stars to rate your driver.");
      return;
    }

    setSubmitting(true);
    try {
      // Create a fire-and-forget endpoint request to submit the rating.
      // If the backend endpoint doesn't exist yet, this will fail gracefully and still let the user go home.
      await apiRequest(`/rides/${tripId}/rate`, {
        method: "POST",
        body: { rating, feedback },
      }).catch(err => console.log("Rating submission error:", err));

      useRideStore.setState({ activeTrip: null });
      navigation.navigate("Shell");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    useRideStore.setState({ activeTrip: null });
    navigation.navigate("Shell");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Ionicons name="star-half" size={64} color="#F59E0B" style={{ alignSelf: "center", marginBottom: 20 }} />
        
        <Text style={styles.title}>Rate your ride</Text>
        <Text style={styles.subtitle}>How was your experience with the driver?</Text>

        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={48}
                color={star <= rating ? "#F59E0B" : Colors.border}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Leave a comment (optional)"
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
            value={feedback}
            onChangeText={setFeedback}
          />
        </View>

        <View style={{ flex: 1 }} />

        <AppButton 
          title={submitting ? "Submitting..." : "Submit Rating"} 
          onPress={handleSubmit} 
          disabled={submitting || rating === 0}
        />
        <Pressable style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.xl },
  title: { fontSize: 24, fontWeight: "900", color: Colors.textPrimary, textAlign: "center" },
  subtitle: { fontSize: 16, color: Colors.textSecondary, textAlign: "center", marginTop: 8 },
  starsContainer: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 40, marginBottom: 40 },
  inputContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: Spacing.md,
  },
  input: {
    color: Colors.textPrimary,
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 100,
  },
  skipBtn: { padding: 16, marginTop: 8, alignItems: "center" },
  skipText: { color: Colors.textSecondary, fontSize: 16, fontWeight: "600" },
});
