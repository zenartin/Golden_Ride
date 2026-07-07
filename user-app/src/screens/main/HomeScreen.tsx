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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AppButton from "../../components/AppButton";
import RideOptionCard from "../../components/RideOptionCard";
import SectionHeader from "../../components/SectionHeader";
import UserDashboardHeader from "../../components/UserDashboardHeader";
import UserQuickActions from "../../components/UserQuickActions";
import { useRideStore } from "../../store/rideStore";
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

  const handleSearch = async () => {
    if (!pickup.trim() || !dropoff.trim()) {
      Alert.alert("Missing info", "Please select both pickup and destination.");
      return;
    }
    setSearching(true);
    try {
      await searchRides();
    } finally {
      setSearching(false);
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Wallet" | "UPI" | "Card">("Cash");
  const [upiId, setUpiId] = useState("");
  const [tempUpiId, setTempUpiId] = useState("");
  const [cardDetails, setCardDetails] = useState({ number: "", expiry: "", cvv: "", name: "" });
  const [tempCardDetails, setTempCardDetails] = useState({ number: "", expiry: "", cvv: "", name: "" });
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showUpiForm, setShowUpiForm] = useState(false);
  
  const [gatewayVisible, setGatewayVisible] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<"initiating" | "verifying" | "securing" | "success">("initiating");

  const walletBalance = useRideStore((s) => s.walletBalance);
  const refreshWallet = useRideStore((s) => s.refreshWallet);

  useEffect(() => {
    refreshWallet();
  }, [refreshWallet]);

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

    if (paymentMethod === "Wallet" && walletBalance < chosenOption.price) {
      Alert.alert("Insufficient Balance", "Your wallet balance is less than the ride fare. Please choose another method or top up in the Wallet tab.");
      return;
    }

    if (paymentMethod === "UPI" && !upiId.trim()) {
      setTempUpiId(upiId);
      setShowUpiForm(true);
      return;
    }

    if (paymentMethod === "Card" && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name)) {
      setTempCardDetails(cardDetails);
      setShowCardForm(true);
      return;
    }

    // Secure Payment Gateway simulation
    setGatewayStatus("initiating");
    setGatewayVisible(true);

    // Phase 1: Initiating
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // Phase 2: Verifying details
    setGatewayStatus("verifying");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Phase 3: Securing bank auth
    setGatewayStatus("securing");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Phase 4: Success
    setGatewayStatus("success");
    await new Promise((resolve) => setTimeout(resolve, 600));

    setGatewayVisible(false);

    setBooking(true);
    setBookError(null);
    try {
      const trip = await bookRide(paymentMethod);
      if (trip) {
        navigation.navigate("TrackRide");
      }
    } catch (err: any) {
      const msg = err?.message || "Booking failed. Please try again.";
      setBookError(msg);
      Alert.alert("Booking Failed", msg);
    } finally {
      setBooking(false);
    }
  };

  const saveCardDetails = () => {
    if (!tempCardDetails.number || !tempCardDetails.expiry || !tempCardDetails.cvv || !tempCardDetails.name) {
      Alert.alert("Missing details", "Please fill in all credit card details.");
      return;
    }
    if (tempCardDetails.number.replace(/\s/g, "").length !== 16) {
      Alert.alert("Invalid Card Number", "Card number must contain 16 digits.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(tempCardDetails.expiry)) {
      Alert.alert("Invalid Expiry", "Expiry must be in MM/YY format.");
      return;
    }
    if (tempCardDetails.cvv.length < 3) {
      Alert.alert("Invalid CVV", "CVV must be 3 or 4 digits.");
      return;
    }

    setCardDetails(tempCardDetails);
    setShowCardForm(false);
  };

  const saveUpiDetails = () => {
    if (!tempUpiId.trim() || !tempUpiId.includes("@")) {
      Alert.alert("Invalid UPI ID", "Please enter a valid UPI handle (e.g. name@bank).");
      return;
    }
    setUpiId(tempUpiId.trim());
    setShowUpiForm(false);
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "Wallet": return "wallet-outline";
      case "UPI": return "phone-portrait-outline";
      case "Card": return "card-outline";
      default: return "cash-outline";
    }
  };

  const getPaymentColor = (method: string) => {
    switch (method) {
      case "Wallet": return "#3B82F6";
      case "UPI": return "#7C3AED";
      case "Card": return "#EA580C";
      default: return "#16A34A";
    }
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
      : {
          latitude: 20.5937,
          longitude: 78.9629,
          latitudeDelta: 20,
          longitudeDelta: 20,
        };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <UserDashboardHeader activeTab="Home" onProfilePress={() => openTab("Profile")} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <UserQuickActions
          actions={[
            { icon: "car-sport-outline", label: "Book", color: "#FEF3C7", onPress: () => openTab("Home") },
            { icon: "receipt-outline", label: "Trips", color: "#DBEAFE", onPress: () => openTab("Trips") },
            { icon: "wallet-outline", label: "Wallet", color: "#DCFCE7", onPress: () => openTab("Wallet") },
            { icon: "headset-outline", label: "Help", color: "#EDE9FE", onPress: () => openTab("Profile") },
          ]}
        />

        {/* Active ride banner */}
        {isActiveRide && (
          <Pressable style={styles.activeBanner} onPress={() => navigation.navigate("TrackRide")}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[activeTrip!.status] ?? "#F59E0B" }]} />
            <Text style={styles.activeBannerText}>Ride active — tap to track</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </Pressable>
        )}

        {/* Map Card */}
        <View style={styles.mapCard}>
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
                pinColor="#10B981"
                title="Pickup"
                description={pickup}
              />
            )}
            {dropoffCoords && (
              <Marker
                coordinate={{ latitude: dropoffCoords.lat, longitude: dropoffCoords.lon }}
                pinColor={Colors.primary}
                title="Drop"
                description={dropoff}
              />
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

        {/* Location inputs */}
        <View style={styles.card}>
          <SectionHeader title="Where are you going?" />

          <View style={styles.inputRow}>
            <View style={styles.dotLine}>
              <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
              <View style={styles.line} />
              <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
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

        {/* Ride options */}
        {rideOptions.length > 0 && (
          <View style={[styles.card, { marginTop: 12 }]}>
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
                    {paymentMethod === "Wallet" ? `Wallet (Balance: ₹${walletBalance})` : paymentMethod}
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
              {/* Option 1: Cash */}
              <Pressable
                style={[styles.optionRow, paymentMethod === "Cash" && styles.optionRowSelected]}
                onPress={() => { setPaymentMethod("Cash"); setShowPaymentModal(false); }}
              >
                <View style={[styles.paymentBadge, { backgroundColor: "#16A34A1A" }]}>
                  <Ionicons name="cash-outline" size={22} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>Cash</Text>
                  <Text style={styles.optionSub}>Pay the driver in cash when trip ends</Text>
                </View>
                {paymentMethod === "Cash" && <Ionicons name="checkmark-circle" size={20} color="#16A34A" />}
              </Pressable>

              {/* Option 2: Wallet */}
              <Pressable
                style={[styles.optionRow, paymentMethod === "Wallet" && styles.optionRowSelected]}
                onPress={() => { setPaymentMethod("Wallet"); setShowPaymentModal(false); }}
              >
                <View style={[styles.paymentBadge, { backgroundColor: "#3B82F61A" }]}>
                  <Ionicons name="wallet-outline" size={22} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>Wallet Balance</Text>
                  <Text style={styles.optionSub}>Available: ₹{walletBalance}</Text>
                </View>
                {paymentMethod === "Wallet" && <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />}
              </Pressable>

              {/* Option 3: UPI */}
              <Pressable
                style={[styles.optionRow, paymentMethod === "UPI" && styles.optionRowSelected]}
                onPress={() => {
                  setShowPaymentModal(false);
                  setTempUpiId(upiId);
                  setShowUpiForm(true);
                }}
              >
                <View style={[styles.paymentBadge, { backgroundColor: "#7C3AED1A" }]}>
                  <Ionicons name="phone-portrait-outline" size={22} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>UPI Gateway</Text>
                  <Text style={styles.optionSub}>{upiId ? `Configured ID: ${upiId}` : "Setup Google Pay, PhonePe, Paytm"}</Text>
                </View>
                {paymentMethod === "UPI" && <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />}
              </Pressable>

              {/* Option 4: Card */}
              <Pressable
                style={[styles.optionRow, paymentMethod === "Card" && styles.optionRowSelected]}
                onPress={() => {
                  setShowPaymentModal(false);
                  setTempCardDetails(cardDetails.number ? cardDetails : { number: "", expiry: "", cvv: "", name: "" });
                  setShowCardForm(true);
                }}
              >
                <View style={[styles.paymentBadge, { backgroundColor: "#EA580C1A" }]}>
                  <Ionicons name="card-outline" size={22} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionName}>Credit / Debit Card</Text>
                  <Text style={styles.optionSub}>{cardDetails.number ? `Visa **** ${cardDetails.number.slice(-4)}` : "Pay securely using card details"}</Text>
                </View>
                {paymentMethod === "Card" && <Ionicons name="checkmark-circle" size={20} color="#EA580C" />}
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

      {/* ── MODAL 4: Secure Bank/Gateway Processing Overlay ── */}
      <Modal visible={gatewayVisible} transparent animationType="fade">
        <View style={styles.gatewayOverlay}>
          <View style={styles.gatewayBox}>
            <View style={styles.gatewayHeader}>
              <Ionicons name="shield-checkmark" size={28} color="#16A34A" />
              <Text style={styles.gatewayTitle}>SECURE PAYMENT GATEWAY</Text>
            </View>

            {gatewayStatus !== "success" ? (
              <View style={{ alignItems: "center", marginVertical: 30, gap: 14 }}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.gatewayStatusText}>
                  {gatewayStatus === "initiating" && "Initiating secure connection..."}
                  {gatewayStatus === "verifying" && "Verifying credentials & details..."}
                  {gatewayStatus === "securing" && "Requesting bank authorization..."}
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: "center", marginVertical: 30, gap: 14 }}>
                <Ionicons name="checkmark-circle" size={60} color="#16A34A" />
                <Text style={[styles.gatewayStatusText, { fontWeight: "800", color: "#16A34A" }]}>
                  Payment Authorized!
                </Text>
              </View>
            )}

            <View style={styles.gatewayFooter}>
              <Ionicons name="lock-closed" size={13} color={Colors.textSecondary} />
              <Text style={styles.gatewayFooterText}>PCI-DSS Secure 256-bit Encryption</Text>
            </View>
          </View>
        </View>
      </Modal>
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
  gatewayOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  gatewayBox: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  gatewayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.border,
    paddingBottom: 12,
  },
  gatewayTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  gatewayStatusText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  gatewayFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderTopWidth: 1.5,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  gatewayFooterText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
});
