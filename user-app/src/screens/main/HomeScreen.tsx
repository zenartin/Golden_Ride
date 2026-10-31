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
import DateTimePicker from "@react-native-community/datetimepicker";
import polyline from "@mapbox/polyline";
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
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

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
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.fitToCoordinates(
            [
              { latitude: pickupCoords.lat, longitude: pickupCoords.lon },
              { latitude: dropoffCoords.lat, longitude: dropoffCoords.lon },
            ],
            { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true }
          );
        }
      }, 600); // Give bottom sheet time to settle and make it look smoother
    }
  }, [pickupCoords, dropoffCoords]);

  // Fetch real road route from OSRM
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickupCoords.lon},${pickupCoords.lat};${dropoffCoords.lon},${dropoffCoords.lat}?overview=full`);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const points = polyline.decode(data.routes[0].geometry);
            const coords = points.map((point: any) => ({
              latitude: point[0],
              longitude: point[1],
            }));
            setRouteCoords(coords);
          }
        } catch (e) {
          console.log("Failed to fetch route", e);
          setRouteCoords([]);
        }
      };
      fetchRoute();
    } else {
      setRouteCoords([]);
    }
  }, [pickupCoords, dropoffCoords]);

  const swapLocations = () => {
    const tempP = pickup;
    const tempPCoords = pickupCoords;
    setPickup(dropoff, dropoffCoords || undefined);
    setDropoff(tempP, tempPCoords || undefined);
  };

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

  const [paymentMethod, setPaymentMethod] = useState<string>("Stripe");
  const authUser = useAuthStore((state) => state.user) as any;
  const wallet = authUser;
  const cardLabel = authUser?.card_last4 ? `${(authUser.card_brand || "Card").toUpperCase()} •••• ${authUser.card_last4}` : "Credit or debit card";
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

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    let v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      v = v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const saveCardDetails = () => {
    setCardDetails(tempCardDetails);
    setShowCardForm(false);
  };

  const saveUpiDetails = () => {
    setUpiId(tempUpiId);
    setShowUpiForm(false);
  };



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
    if (activeTrip?.status === "completed") {
      Alert.alert(
        "Payment Outstanding",
        "You have a completed ride that requires payment before booking a new trip.",
        [
          { text: "Pay Now", onPress: () => navigation.navigate("Payment", { tripId: activeTrip.id }) },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

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

    // Stripe is the only payment method now. No client-side validation needed for mock forms.

    setBooking(true);
    setBookError(null);
    try {
      // 1. Book the ride first to get the trip ID and fare
      const trip = await bookRide(paymentMethod, undefined);
      if (!trip) throw new Error("Booking failed. Please try again.");

      // After booking, automatically navigate to the tracking screen
      navigation.navigate("TrackRide");
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
      : {
          latitude: 39.8283,
          longitude: -98.5795,
          latitudeDelta: 30,
          longitudeDelta: 30,
        };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* 1. Full Screen Map in Background */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_DEFAULT}
        initialRegion={mapRegion}
        showsUserLocation
        showsMyLocationButton={false}
        pitchEnabled={false}
      >
        {pickupCoords && (
          <Marker coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lon }} title="Pickup" description={pickup}>
            <View style={{ backgroundColor: '#10B981', padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#fff' }}>
              <Ionicons name="location" size={20} color="#fff" />
            </View>
          </Marker>
        )}
        {dropoffCoords && (
          <Marker coordinate={{ latitude: dropoffCoords.lat, longitude: dropoffCoords.lon }} title="Drop" description={dropoff}>
            <View style={{ backgroundColor: '#EF4444', padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#fff' }}>
              <Ionicons name="flag" size={20} color="#fff" />
            </View>
          </Marker>
        )}
        {pickupCoords && dropoffCoords && (
          <Polyline
            coordinates={
              routeCoords.length > 0
                ? routeCoords
                : [
                    { latitude: pickupCoords.lat, longitude: pickupCoords.lon },
                    { latitude: dropoffCoords.lat, longitude: dropoffCoords.lon },
                  ]
            }
            strokeColor={Colors.primary}
            strokeWidth={4}
            lineDashPattern={routeCoords.length > 0 ? undefined : [6, 4]}
          />
        )}
      </MapView>

      {/* 2. Floating Header */}
      {rideOptions.length === 0 && (
        <View style={styles.floatingHeader}>
          <UserDashboardHeader activeTab="Home" onProfilePress={() => openTab("Profile")} />
        </View>
      )}


      {/* 3. Floating Bottom Sheet UI */}
      <View style={styles.bottomOverlay}>
        {isActiveRide && (
          <Pressable style={styles.activeBanner} onPress={() => navigation.navigate("TrackRide")}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[activeTrip!.status] ?? "#F59E0B" }]} />
            <Text style={styles.activeBannerText}>Ride active — tap to track</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </Pressable>
        )}

        <ScrollView contentContainerStyle={{ padding: Spacing.md }} showsVerticalScrollIndicator={false} bounces={false}>



        {/* Bottom Sheet Content */}
        {rideOptions.length > 0 ? (
          <View style={{ backgroundColor: Colors.surface, borderRadius: 24, padding: Spacing.lg, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 10 }}>
            {/* 1. Summary View */}
            <View style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 4 }}>
              <View style={styles.inputRow}>
                <View style={styles.dotLine}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#10B981", marginVertical: 4 }} />
                  <View style={[styles.line, { height: 16, marginVertical: 2 }]} />
                  <Ionicons name="flag" size={16} color="#EF4444" />
                </View>
                <View style={{ flex: 1, gap: 8, justifyContent: "center", overflow: "hidden" }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.textPrimary, flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">{pickup}</Text>
                  <View style={{ height: 1, backgroundColor: Colors.border, width: "100%" }} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.textPrimary, flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">{dropoff}</Text>
                </View>

              </View>
            </View>

            {/* 2. Ride options */}
            <View style={{ marginTop: 16, paddingBottom: 10 }}>
              <Text style={{ fontSize: Typography.heading, fontWeight: "900", color: Colors.textPrimary, marginBottom: 16, paddingHorizontal: 4 }}>Choose a ride</Text>
              <View style={{ gap: 12 }}>
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
              <Pressable onPress={() => setShowPaymentModal(true)} style={[styles.paymentSelector, { marginTop: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Colors.border, borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
                <View style={[styles.paymentSelectorLeft, { flex: 1 }]}>
                  <View style={[styles.paymentBadge, { backgroundColor: "#635BFF" + "1A" }]}>
                    <Ionicons name="card" size={20} color="#635BFF" />
                  </View>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.paymentMethodTitle}>Payment Method</Text>
                    <Text style={styles.paymentMethodValue} numberOfLines={1}>
                      {paymentMethod === "Wallet" ? `Wallet ($${(wallet?.wallet_balance ?? 0).toFixed(2)})` : cardLabel}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
              </Pressable>

              {bookError ? <Text style={[styles.errorText, { marginTop: 12 }]}>{bookError}</Text> : null}

              <Pressable
                style={[
                  styles.bookBtn,
                  booking && styles.bookBtnDisabled,
                  { marginTop: 20, minHeight: 60, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }
                ]}
                onPress={handleBook}
                disabled={booking}
              >
                  {booking ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.bookBtnText, { fontSize: 18, fontWeight: "900", letterSpacing: 0.5, textAlign: "center", paddingHorizontal: 10 }]} adjustsFontSizeToFit numberOfLines={1}>
                      {selectedRideClass ? `Confirm ${selectedRideClass.charAt(0).toUpperCase() + selectedRideClass.slice(1)}` : "Select a Ride"}
                    </Text>
                  )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <SectionHeader title="Where are you going?" />

            <View style={styles.inputRow}>
              <View style={styles.dotLine}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#10B981", marginVertical: 4 }} />
                <View style={styles.line} />
                <Ionicons name="flag" size={20} color="#EF4444" />
              </View>

              <View style={{ flex: 1, gap: 10 }}>
                {/* Pickup */}
                <Pressable
                  style={[styles.inputBox, pickup ? styles.inputBoxFilled : null]}
                  onPress={() => navigation.navigate("LocationPicker", { mode: "pickup" })}
                >
                  <View style={[styles.row, { flex: 1 }]}>
                    <Text style={[pickup ? styles.inputText : styles.inputPlaceholder, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                      {pickup || "Current Location"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </Pressable>

                {/* Swap Button Overlay */}
                <View style={styles.swapBtnContainer}>
                  <Pressable style={styles.swapBtn} onPress={swapLocations}>
                    <Ionicons name="swap-vertical" size={18} color={Colors.primary} />
                  </Pressable>
                </View>

                {/* Dropoff */}
                <Pressable
                  style={[styles.inputBox, dropoff ? styles.inputBoxFilled : null]}
                  onPress={() => navigation.navigate("LocationPicker", { mode: "dropoff" })}
                >
                  <View style={[styles.row, { flex: 1 }]}>
                    <Text style={[dropoff ? styles.inputText : styles.inputPlaceholder, { flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                      {dropoff || "Where to?"}
                    </Text>
                  </View>
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



      </ScrollView>
      </View>

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


              {([["Stripe", cardLabel, "Charged when your trip ends", "card-outline"], ["Wallet", `Wallet ($${(wallet?.wallet_balance ?? 0).toFixed(2)})`, "Includes redeemed gift cards", "wallet-outline"]] as const).map(([id, name, sub, icon]) => (
                <Pressable
                  key={id}
                  style={[styles.optionRow, paymentMethod === id && styles.optionRowSelected]}
                  onPress={() => { setPaymentMethod(id); setShowPaymentModal(false); }}
                >
                  <View style={[styles.paymentBadge, { backgroundColor: "#02042B" + "1A" }]}>
                    <Ionicons name={icon} size={22} color="#02042B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionName}>{name}</Text>
                    <Text style={styles.optionSub}>{sub}</Text>
                  </View>
                  {paymentMethod === id && <Ionicons name="checkmark-circle" size={20} color="#02042B" />}
                </Pressable>
              ))}
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
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  floatingActions: {
    position: "absolute",
    right: 16,
    bottom: "45%",
    zIndex: 10,
  },
  floatingIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 10,
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "50%",
    backgroundColor: "transparent",
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 8,
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
    overflow: "hidden",
  },
  inputBoxFilled: { borderColor: Colors.primary + "66" },
  swapBtnContainer: {
    position: "absolute",
    right: 20,
    top: "50%",
    marginTop: -16, // Center vertically between the two inputs
    zIndex: 10,
    elevation: 10,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border + "88",
  },
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
