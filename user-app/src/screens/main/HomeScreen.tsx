import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
  StyleSheet,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  BackHandler,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useStripe } from "@stripe/stripe-react-native";
import { apiRequest } from "../../api/client";
import { API_ENDPOINTS } from "../../api/endpoints";
import AppButton from "../../components/AppButton";
import RideOptionCard from "../../components/RideOptionCard";
import SectionHeader from "../../components/SectionHeader";
import UserDashboardHeader from "../../components/UserDashboardHeader";
import UserQuickActions from "../../components/UserQuickActions";
import { useRideStore } from "../../store/rideStore";
import { useAuthStore } from "../../store/authStore";
import { Colors, Spacing, Typography } from "../../theme";
import { MainStackParamList } from "../../navigation/MainNavigator";

type Props = NativeStackScreenProps<MainStackParamList, "Shell"> & {
  openTab: (tab: "Home" | "Trips" | "Wallet" | "Profile") => void;
};

export default function HomeScreen({ navigation, route, openTab }: Props) {
  const pickup = useRideStore((s) => s.pickup);
  const dropoff = useRideStore((s) => s.dropoff);
  const pickupCoords = useRideStore((s) => s.pickupCoords);
  const dropoffCoords = useRideStore((s) => s.dropoffCoords);
  const rideOptions = useRideStore((s) => s.rideOptions);
  const selectedRideClass = useRideStore((s) => s.selectedRideClass);
  const setPickup = useRideStore((s) => s.setPickup);
  const setDropoff = useRideStore((s) => s.setDropoff);
  const setSelectedRideClass = useRideStore((s) => s.setSelectedRideClass);
  const searchRides = useRideStore((s) => s.searchRides);
  const bookRide = useRideStore((s) => s.bookRide);
  const activeTrip = useRideStore((s) => s.activeTrip);

  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);

  // Handle location picked from LocationPickerScreen
  useEffect(() => {
    const params = route.params as any;
    if (params?.pickedLocation) {
      const { mode, place } = params.pickedLocation;
      if (mode === "pickup") {
        setPickup(place.shortName, { lat: place.lat, lon: place.lon });
      } else {
        setDropoff(place.shortName, { lat: place.lat, lon: place.lon });
      }
      // Clear the param to avoid re-applying on next render
      navigation.setParams({ pickedLocation: undefined } as any);
    }
  }, [route.params]);

  // Fit map to show both markers when both coords are available
  useEffect(() => {
    if (pickupCoords && dropoffCoords && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: pickupCoords.lat, longitude: pickupCoords.lon },
          { latitude: dropoffCoords.lat, longitude: dropoffCoords.lon },
        ],
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
      );
    }
  }, [pickupCoords, dropoffCoords]);

  // Handle hardware back button to clear ride options instead of exiting
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (rideOptions && rideOptions.length > 0) {
          useRideStore.setState({ rideOptions: [] });
          return true; // handled
        }
        return false; // let default behavior happen
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [rideOptions?.length])
  );

  const handleSearch = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert("Missing info", "Please select both pickup and destination.");
      return;
    }
    setSearching(true);
    try {
      const results = await searchRides();
      if (results.length === 0) {
        Alert.alert("No Drivers Found", "Could not find any drivers nearby. Please try again later.");
      }
    } catch (err: any) {
      Alert.alert("Search Error", err?.message || "Something went wrong.");
    } finally {
      setSearching(false);
    }
  };

  // If the active trip completes while user is on Home screen, redirect to Payment
  useEffect(() => {
    if (activeTrip?.status === "completed") {
      navigation.navigate("Payment", { tripId: activeTrip.id });
    }
  }, [activeTrip?.status]);

  const [paymentMethod, setPaymentMethod] = useState<"Razorpay">("Razorpay");
  const [upiId, setUpiId] = useState("");
  const [tempUpiId, setTempUpiId] = useState("");
  const [cardDetails, setCardDetails] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [tempCardDetails, setTempCardDetails] = useState({ number: "", expiry: "", cvv: "", name: "" });
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showUpiForm, setShowUpiForm] = useState(false);
  
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const walletBalance = useRideStore((s) => s.walletBalance);
  const refreshWallet = useRideStore((s) => s.refreshWallet);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (user?.card_number) {
      setCardDetails({
        number: user.card_number,
        expiry: user.card_expiry || "",
        cvv: user.card_cvv || "",
        name: user.card_holder || "",
      });
      setPaymentMethod("Card");
    }
  }, [user]);

  const handleBook = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert("Missing info", "Please select both pickup and destination.");
      return;
    }
    if (rideOptions.length === 0) {
      Alert.alert("No ride options", "Please tap 'Get Fare' first.");
      return;
    }

    const chosenOption = rideOptions.find((item) => item.id === selectedRideClass) ?? rideOptions[0];
    if (!chosenOption) return;

    if (paymentMethod === "UPI" && !upiId.trim()) {
      Alert.alert("Payment Required", "Please configure your UPI ID first.");
      setTempUpiId(upiId);
      setShowUpiForm(true);
      return;
    }

    if (paymentMethod === "Card" && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name)) {
      Alert.alert("Payment Required", "Please enter your card details first.");
      setTempCardDetails(cardDetails);
      setShowCardForm(true);
      return;
    }

    setBooking(true);
    setBookError(null);
    try {
      // 1. Book the ride first to get the trip ID and fare
      const trip = await bookRide(paymentMethod);
      if (!trip) throw new Error("Booking failed. Please try again.");

      // After booking, automatically navigate to the tracking screen
      navigation.navigate("TrackRide");

      // Post-Ride Payment Flow: We no longer navigate to Payment immediately.
      // The user stays on the tracking screen. When the driver completes the ride,
      // TrackRideScreen will automatically navigate to PaymentScreen.
    } catch (err: any) {
      const msg = err?.message || "Payment failed. Please try again.";
      setBookError(msg);
      Alert.alert("Payment Failed", msg);
    } finally {
      setBooking(false);
    }
  };

  const getPaymentIcon = (method: string) => {
    return "flash-outline";
  };

  const getPaymentColor = (method: string) => {
    return "#02042B";
  };

  const isActiveRide =
    activeTrip &&
    ["searching", "confirmed", "arriving", "on_trip"].includes(activeTrip.status);

  const statusColors: Record<string, string> = {
    searching: "#F59E0B",
    confirmed: "#10B981",
    arriving: "#3B82F6",
    on_trip: "#8B5CF6",
  };

  const mapRegion =
    pickupCoords
      ? {
          latitude: pickupCoords.lat,
          longitude: pickupCoords.lon,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }
      : user?.country === "USA"
      ? {
          latitude: 39.8283,
          longitude: -98.5795,
          latitudeDelta: 30,
          longitudeDelta: 30,
        }
      : {
          latitude: 20.5937,
          longitude: 78.9629,
          latitudeDelta: 20,
          longitudeDelta: 20,
        };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {rideOptions.length === 0 && (
        <UserDashboardHeader activeTab="Home" onProfilePress={() => openTab("Profile")} />
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {rideOptions.length === 0 && (
          <UserQuickActions
            actions={[
              { icon: "car-sport-outline", label: "Book", color: "#FEF3C7", onPress: () => openTab("Home") },
              { icon: "receipt-outline", label: "Trips", color: "#DBEAFE", onPress: () => openTab("Trips") },
              { icon: "wallet-outline", label: "Wallet", color: "#DCFCE7", onPress: () => openTab("Wallet") },
              { icon: "headset-outline", label: "Help", color: "#EDE9FE", onPress: () => openTab("Profile") },
            ]}
          />
        )}

        {/* Active ride banner */}
        {isActiveRide && (
          <Pressable style={styles.activeBanner} onPress={() => navigation.navigate("TrackRide")}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[activeTrip!.status] ?? "#F59E0B" }]} />
            <Text style={styles.activeBannerText}>Ride active — tap to track</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </Pressable>
        )}

        {/* Map Card */}
        <View style={[styles.mapCard, { height: rideOptions.length > 0 ? 300 : 250 }]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={mapRegion}
            showsUserLocation
            showsMyLocationButton={false}
            pitchEnabled={false}
            scrollEnabled={!searching}
          >
            {pickupCoords && (
              <Marker
                coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lon }}
                title="Pickup"
                description={pickup}
              >
                <View style={{ backgroundColor: '#10B981', padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#fff' }}>
                  <Ionicons name="location" size={20} color="#fff" />
                </View>
              </Marker>
            )}
            {dropoffCoords && (
              <Marker
                coordinate={{ latitude: dropoffCoords.lat, longitude: dropoffCoords.lon }}
                title="Drop"
                description={dropoff}
              >
                <View style={{ backgroundColor: '#EF4444', padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#fff' }}>
                  <Ionicons name="flag" size={20} color="#fff" />
                </View>
              </Marker>
            )}
            {pickupCoords && dropoffCoords && (
              <Polyline
                coordinates={[
                  { latitude: pickupCoords.lat, longitude: pickupCoords.lon },
                  { latitude: dropoffCoords.lat, longitude: dropoffCoords.lon },
                ]}
                strokeColor={Colors.primary}
                strokeWidth={3}
                lineDashPattern={[6, 4]}
              />
            )}
          </MapView>
        </View>

        {/* Location inputs or Summary */}
        {rideOptions.length > 0 ? (
          <View style={styles.summaryCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Pickup</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{pickup}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.textSecondary} style={{ marginHorizontal: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryLabel}>Dropoff</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{dropoff}</Text>
            </View>
            <Pressable onPress={() => useRideStore.setState({ rideOptions: [] })} style={styles.editBtn}>
              <Ionicons name="pencil" size={18} color={Colors.primary} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <SectionHeader title="Where are you going?" />

            <View style={styles.inputRow}>
              <View style={styles.dotLine}>
                <Ionicons name="location" size={22} color="#10B981" />
                <View style={styles.line} />
                <Ionicons name="flag" size={20} color="#EF4444" />
              </View>

              <View style={{ flex: 1, gap: 10 }}>
                {/* Pickup */}
                <Pressable
                  style={[styles.inputBox, pickup ? styles.inputBoxFilled : null]}
                  onPress={() => navigation.navigate("LocationPicker", { mode: "pickup" })}
                >
                  <Text style={pickup ? styles.inputText : styles.inputPlaceholder} numberOfLines={1}>
                    {pickup || "Tap to set pickup location"}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </Pressable>

                {/* Dropoff */}
                <Pressable
                  style={[styles.inputBox, dropoff ? styles.inputBoxFilled : null]}
                  onPress={() => navigation.navigate("LocationPicker", { mode: "dropoff" })}
                >
                  <Text style={dropoff ? styles.inputText : styles.inputPlaceholder} numberOfLines={1}>
                    {dropoff || "Tap to set destination"}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            <AppButton
              title={searching ? "Calculating fare…" : "Get Fare"}
              onPress={handleSearch}
              style={{ opacity: searching ? 0.7 : 1 }}
            />
            {searching && (
              <View style={styles.row}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.muted}>Fetching real route via OpenStreetMap…</Text>
              </View>
            )}
          </View>
        )}

        {/* Ride options */}
        {rideOptions.length > 0 && (
          <View style={[styles.card, { marginTop: 12, flex: 1 }]}>
            <SectionHeader title="Choose your ride" />
            <View style={{ gap: 10 }}>
              {rideOptions.map((option) => (
                <RideOptionCard
                  key={option.id}
                  option={option}
                  selected={option.id === selectedRideClass}
                  onPress={() => setSelectedRideClass(option.id)}
                />
              ))}
            </View>

            {/* Payment Method Selector Row */}
            <Pressable style={styles.paymentSelector} onPress={() => setShowPaymentModal(true)}>
              <View style={styles.paymentSelectorLeft}>
                <View style={[styles.paymentBadge, { backgroundColor: getPaymentColor(paymentMethod) + "1A" }]}>
                  <Ionicons name={getPaymentIcon(paymentMethod)} size={20} color={getPaymentColor(paymentMethod)} />
                </View>
                <View>
                  <Text style={styles.paymentMethodTitle}>Payment Method</Text>
                  <Text style={styles.paymentMethodValue}>
                    {paymentMethod === "Wallet" ? `Wallet (Balance: ${user?.country === "USA" ? "$" : "₹"}${walletBalance})` : paymentMethod}
                    {paymentMethod === "Card" && cardDetails.number ? ` (ending in ${cardDetails.number.slice(-4)})` : ""}
                    {paymentMethod === "UPI" && upiId ? ` (${upiId})` : ""}
                  </Text>
                </View>
              </View>
              <Text style={styles.changeText}>Change</Text>
            </Pressable>

            {bookError ? <Text style={styles.errorText}>{bookError}</Text> : null}

            <Pressable
              style={[styles.bookBtn, booking && styles.bookBtnDisabled]}
              onPress={handleBook}
              disabled={booking}
            >
              {booking ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="car-sport" size={20} color="#fff" />
                  <Text style={styles.bookBtnText}>Book Ride</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Empty state */}
        {rideOptions.length === 0 && !searching && (
          <View style={[styles.emptyCard, { marginTop: 12 }]}>
            <Ionicons name="map-outline" size={40} color={Colors.textSecondary} style={{ alignSelf: "center" }} />
            <Text style={styles.emptyText}>
              Select pickup & destination above, then tap{" "}
              <Text style={{ fontWeight: "700", color: Colors.primary }}>Get Fare</Text> to see real-time pricing.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── MODAL 1: Payment Method Chooser Bottom Sheet ── */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowPaymentModal(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Choose Payment Method</Text>
              <Pressable onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </Pressable>
            </View>

              <View style={{ gap: 12, paddingVertical: 10 }}>
              {/* Option 1: Razorpay */}
              <Pressable
                style={[styles.optionRow, paymentMethod === "Razorpay" && styles.optionRowSelected]}
                onPress={() => {
                  setPaymentMethod("Razorpay");
                  setShowPaymentModal(false);
                }}
              >
                <View style={[styles.paymentBadge, { backgroundColor: "#02042B" + "1A" }]}>
                  <Ionicons name="flash-outline" size={22} color="#02042B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>Razorpay (Cards / UPI)</Text>
                  <Text style={styles.optionSub}>Fast & secure payments</Text>
                </View>
                {paymentMethod === "Razorpay" && <Ionicons name="checkmark-circle" size={20} color="#02042B" />}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── MODAL 2: Credit Card Form + Interactive Preview ── */}
      <Modal visible={showCardForm} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.modalOverlay} keyboardShouldPersistTaps="handled">
            <View style={[styles.bottomSheet, { maxHeight: "90%" }]}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Enter Card Details</Text>
                <Pressable onPress={() => setShowCardForm(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </Pressable>
              </View>

              {/* Beautiful Premium Metal Credit Card Preview */}
              <LinearGradient
                colors={["#1E1B4B", "#311042", "#4C1D95"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.creditCardPreview}
              >
                <View style={styles.cardPreviewTop}>
                  <Text style={styles.cardPreviewLogo}>GOLDEN RIDE</Text>
                  <Ionicons name="cellular" size={24} color="gold" style={{ opacity: 0.8 }} />
                </View>
                
                <Text style={styles.cardPreviewNumber}>
                  {tempCardDetails.number || "•••• •••• •••• ••••"}
                </Text>

                <View style={styles.cardPreviewBottom}>
                  <View>
                    <Text style={styles.cardPreviewLabel}>CARD HOLDER</Text>
                    <Text style={styles.cardPreviewVal} numberOfLines={1}>
                      {tempCardDetails.name.toUpperCase() || "NAME SURNAME"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.cardPreviewLabel}>EXPIRES</Text>
                    <Text style={styles.cardPreviewVal}>
                      {tempCardDetails.expiry || "MM/YY"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Form Fields */}
              <View style={{ gap: 14, marginTop: 10 }}>
                <View>
                  <Text style={styles.formLabel}>Cardholder Name</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. ARJUN MEHTA"
                    placeholderTextColor={Colors.textMuted}
                    value={tempCardDetails.name}
                    onChangeText={(t) => setTempCardDetails({ ...tempCardDetails, name: t })}
                    autoCapitalize="characters"
                  />
                </View>

                <View>
                  <Text style={styles.formLabel}>Card Number</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    maxLength={19}
                    value={tempCardDetails.number}
                    onChangeText={(t) => setTempCardDetails({ ...tempCardDetails, number: formatCardNumber(t) })}
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Expiry Date</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="MM/YY"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={5}
                      value={tempCardDetails.expiry}
                      onChangeText={(t) => setTempCardDetails({ ...tempCardDetails, expiry: formatExpiry(t) })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>CVV Code</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="123"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                      value={tempCardDetails.cvv}
                      onChangeText={(t) => setTempCardDetails({ ...tempCardDetails, cvv: t.replace(/\D/g, "") })}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                  <Pressable style={[styles.formBtn, { backgroundColor: Colors.border }]} onPress={() => setShowCardForm(false)}>
                    <Text style={{ fontWeight: "700", color: Colors.textPrimary }}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[styles.formBtn, { backgroundColor: "#EA580C" }]} onPress={() => {
                    saveCardDetails();
                    setPaymentMethod("Card");
                  }}>
                    <Text style={{ fontWeight: "800", color: "#fff" }}>Secure & Use</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL 3: UPI Details Input Bottom Sheet ── */}
      <Modal visible={showUpiForm} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowUpiForm(false)}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Link UPI Handle</Text>
              <Pressable onPress={() => setShowUpiForm(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <View style={{ gap: 14, paddingVertical: 10 }}>
              <Text style={styles.upiDesc}>
                Enter your Virtual Payment Address (VPA) / UPI ID. A secure collect request will be sent when you book.
              </Text>

              <View style={styles.upiInputWrap}>
                <Ionicons name="at" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.upiInput}
                  placeholder="e.g. mobile@okaxis"
                  placeholderTextColor={Colors.textMuted}
                  value={tempUpiId}
                  onChangeText={setTempUpiId}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Suggestions */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {["@okaxis", "@okhdfcbank", "@okicici", "@ybl", "@paytm"].map((sugg) => (
                  <Pressable
                    key={sugg}
                    style={styles.suggestionChip}
                    onPress={() => {
                      const base = tempUpiId.split("@")[0] || "username";
                      setTempUpiId(base + sugg);
                    }}
                  >
                    <Text style={styles.suggestionText}>{sugg}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <Pressable style={[styles.formBtn, { backgroundColor: Colors.border }]} onPress={() => setShowUpiForm(false)}>
                  <Text style={{ fontWeight: "700", color: Colors.textPrimary }}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.formBtn, { backgroundColor: "#7C3AED" }]} onPress={() => {
                  saveUpiDetails();
                  setPaymentMethod("UPI");
                }}>
                  <Text style={{ fontWeight: "800", color: "#fff" }}>Link UPI</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Stripe handles its own native payment sheet UI — no custom modal needed */}
    </View>
  );
}

const styles = StyleSheet.create({
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF8EB",
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  activeBannerText: { flex: 1, color: Colors.textPrimary, fontWeight: "700", fontSize: Typography.small },
  mapCard: {
    height: 200,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  map: { flex: 1 },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryLabel: { fontSize: 10, color: Colors.textSecondary, textTransform: "uppercase", fontWeight: "700" },
  summaryValue: { fontSize: 13, fontWeight: "800", color: Colors.textPrimary, marginTop: 2 },
  editBtn: { padding: 8, marginLeft: 8, backgroundColor: Colors.primary + "1A", borderRadius: 20 },
  inputRow: { flexDirection: "row", gap: 12, alignItems: "stretch" },
  dotLine: { alignItems: "center", paddingTop: 14, gap: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { flex: 1, width: 2, backgroundColor: Colors.border, marginVertical: 4 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputBoxFilled: { borderColor: Colors.primary + "66" },
  inputPlaceholder: { color: Colors.textSecondary, fontSize: Typography.small, flex: 1 },
  inputText: { color: Colors.textPrimary, fontSize: Typography.small, fontWeight: "600", flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  muted: { color: Colors.textSecondary, fontSize: Typography.small },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { color: "#fff", fontWeight: "800", fontSize: Typography.body },
  emptyCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.small, textAlign: "center", lineHeight: 20 },
  errorText: { color: "#EF4444", fontSize: Typography.small, textAlign: "center" },

  // New styles for Payment Gateways
  paymentSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
  },
  paymentSelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentMethodTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
  },
  paymentMethodValue: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginTop: 1,
  },
  changeText: {
    fontSize: Typography.small,
    fontWeight: "800",
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 35,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionRowSelected: {
    borderColor: Colors.primary + "33",
    backgroundColor: Colors.surface,
  },
  optionName: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  optionSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  creditCardPreview: {
    borderRadius: 16,
    aspectRatio: 1.586, // standard credit card ratio
    padding: 20,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 16,
  },
  cardPreviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPreviewLogo: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  cardPreviewNumber: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 2.5,
    textAlign: "center",
    marginVertical: 10,
  },
  cardPreviewBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardPreviewLabel: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "500",
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  cardPreviewVal: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
    maxWidth: 180,
  },
  formLabel: {
    fontSize: Typography.small,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  formBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  upiDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  upiInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  upiInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.border,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
});
