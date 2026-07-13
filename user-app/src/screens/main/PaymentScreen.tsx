import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import WebView, { WebViewNavigation } from "react-native-webview";
import { Colors } from "../../theme";
import { useRideStore, Trip } from "../../store/rideStore";
import { useAuthStore } from "../../store/authStore";
import { apiRequest } from "../../api/client";
import { API_ENDPOINTS } from "../../api/endpoints";
import AppButton from "../../components/AppButton";

export default function PaymentScreen({ route, navigation }: any) {
  const { tripId } = route.params;
  const fetchTripDetail = useRideStore((state) => state.fetchTripDetail);
  const user = useAuthStore((state) => state.user);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [driverPaid, setDriverPaid] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");

  // Razorpay WebView state
  const [razorpayWebViewUrl, setRazorpayWebViewUrl] = useState<string | null>(null);
  const [razorpayLinkId, setRazorpayLinkId] = useState<string | null>(null);
  const [razorpayCapturing, setRazorpayCapturing] = useState(false);

  useEffect(() => {
    fetchTripDetail(tripId).then(setTrip);
  }, [tripId]);

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.loading}>Loading payment details...</Text>
      </SafeAreaView>
    );
  }

  const totalFare = trip.price;
  const currencySymbol = user?.country === "USA" ? "$" : "₹";

  // Determine which payment method was set on the trip
  const isRazorpay =
    trip.paymentMethod?.toLowerCase().includes("razorpay") ?? false;

  // ── Stripe Payment ──────────────────────────────────────────────────────────
  const handleStripePayment = async () => {
    setProcessing(true);
    setProcessingStep("Creating secure payment session…");

    try {
      const sheetData = await apiRequest<{
        paymentIntent: string;
        ephemeralKey: string;
        customer: string;
        publishableKey: string;
      }>(API_ENDPOINTS.STRIPE_PAYMENT_SHEET, {
        method: "POST",
        body: { trip_id: Number(tripId) },
      });

      setProcessingStep("Initialising Stripe…");

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Golden Ride",
        paymentIntentClientSecret: sheetData.paymentIntent,
        defaultBillingDetails: { name: user?.name ?? "" },
        allowsDelayedPaymentMethods: false,
      });
      if (initError) throw new Error(initError.message);

      setProcessing(false);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        throw new Error(presentError.message);
      }

      setDriverPaid(true);
      Alert.alert(
        "Payment Success! 🎉",
        `${currencySymbol}${totalFare} paid successfully via Stripe.`
      );
    } catch (err: any) {
      setProcessing(false);
      Alert.alert("Payment Failed", err?.message || "Please try again.");
    }
  };

  // ── Razorpay Payment ──────────────────────────────────────────────────────────
  const handleRazorpayPayment = async () => {
    setProcessing(true);
    setProcessingStep("Generating Razorpay link…");

    try {
      const orderData = await apiRequest<{
        link_id: string;
        checkout_url: string;
        currency: string;
        amount: string;
      }>("/razorpay/create-link", {
        method: "POST",
        body: { trip_id: Number(tripId) },
      });

      setRazorpayLinkId(orderData.link_id);
      setProcessing(false);
      // Open WebView with the Razorpay checkout URL
      setRazorpayWebViewUrl(orderData.checkout_url);
    } catch (err: any) {
      setProcessing(false);
      Alert.alert(
        "Razorpay Error",
        err?.message || "Could not create payment link. Please try again."
      );
    }
  };

  // Called after user pays on Razorpay — intercept return URL and verify
  const handleRazorpayCapture = async (url: string) => {
    setRazorpayWebViewUrl(null);
    setRazorpayCapturing(true);
    setProcessingStep("Verifying Razorpay payment…");

    try {
      // Parse query params from callback URL
      // example.com/razorpay/success?razorpay_payment_id=pay_...&razorpay_payment_link_id=plink_...&razorpay_payment_link_reference_id=...&razorpay_payment_link_status=paid&razorpay_signature=...
      const parseParam = (key: string) => url.match(new RegExp(`[?&]${key}=([^&]+)`))?.[1] ?? "";

      const paymentId = parseParam("razorpay_payment_id");
      const linkId = parseParam("razorpay_payment_link_id") || razorpayLinkId;
      const refId = parseParam("razorpay_payment_link_reference_id");
      const status = parseParam("razorpay_payment_link_status");
      const signature = parseParam("razorpay_signature");

      await apiRequest<{
        status: string;
        trip_id: number;
        payment_method: string;
        transaction_id: string;
      }>("/razorpay/verify", {
        method: "POST",
        body: {
          trip_id: Number(tripId),
          razorpay_payment_id: paymentId,
          razorpay_payment_link_id: linkId,
          razorpay_payment_link_reference_id: refId,
          razorpay_payment_link_status: status,
          razorpay_signature: signature,
        },
      });

      setRazorpayCapturing(false);
      setDriverPaid(true);
      Alert.alert(
        "Payment Success! 🎉",
        `${currencySymbol}${totalFare} paid successfully via Razorpay.`
      );
    } catch (err: any) {
      setRazorpayCapturing(false);
      Alert.alert(
        "Capture Failed",
        err?.message || "Payment verification failed. Please contact support."
      );
    }
  };

  // WebView navigation handler — detect when Razorpay redirects to return URL
  const handleWebViewNavigationChange = (navState: WebViewNavigation) => {
    const { url } = navState;
    if (!url) return;

    if (url.includes("example.com/razorpay/success")) {
      handleRazorpayCapture(url);
    } else if (url.includes("example.com/razorpay/cancel")) {
      setRazorpayWebViewUrl(null);
      Alert.alert("Cancelled", "Razorpay payment was cancelled.");
    }
  };

  const handleDone = () => {
    // Navigate to Rating screen instead of Shell directly
    navigation.navigate("Rating", { tripId });
  };

  const paymentMethodLabel = isRazorpay ? "Razorpay" : "Stripe";
  const paymentIcon = isRazorpay ? "flash-outline" : "card-outline";

  return (
    <SafeAreaView style={styles.safe}>
      {/* Razorpay WebView Modal */}
      <Modal
        visible={!!razorpayWebViewUrl}
        animationType="slide"
        onRequestClose={() => {
          setRazorpayWebViewUrl(null);
          Alert.alert("Cancelled", "Razorpay payment was cancelled.");
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#02042B" }}>
          <View style={[styles.webviewHeader, { backgroundColor: "#02042B" }]}>
            <Pressable
              style={styles.webviewClose}
              onPress={() => {
                setRazorpayWebViewUrl(null);
                Alert.alert("Cancelled", "Razorpay payment was cancelled.");
              }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.webviewTitle}>Razorpay Secure Checkout</Text>
            <View style={{ width: 40 }} />
          </View>
          {razorpayWebViewUrl ? (
            <WebView
              source={{ uri: razorpayWebViewUrl }}
              onNavigationStateChange={handleWebViewNavigationChange}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoader}>
                  <ActivityIndicator size="large" color="#02042B" />
                  <Text style={[styles.webviewLoaderText, { color: "#02042B" }]}>
                    Loading Razorpay…
                  </Text>
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>

      <View style={styles.header}>
        <Text style={styles.pageTitle}>Complete Payment</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Ride Summary */}
        <View style={styles.card}>
          <Ionicons
            name="checkmark-circle"
            size={48}
            color="#10B981"
            style={{ alignSelf: "center" }}
          />
          <Text style={styles.successTitle}>Ride Completed!</Text>
          <Text style={styles.totalAmount}>
            {currencySymbol}
            {totalFare}
          </Text>
          <Text style={styles.tripRoute}>
            {trip.pickup} → {trip.dropoff}
          </Text>
        </View>

        {!driverPaid ? (
          <>
            {/* Payment Gateway Info Card */}
            <View style={[styles.card, isRazorpay ? styles.razorpayInfoCard : styles.stripeInfoCard]}>
              <View style={styles.alertHeader}>
                <Ionicons
                  name={paymentIcon as any}
                  size={24}
                  color={isRazorpay ? "#02042B" : "#16A34A"}
                />
                <Text
                  style={[
                    styles.alertTitle,
                    { color: isRazorpay ? "#02042B" : "#B45309" },
                  ]}
                >
                  {isRazorpay ? "Razorpay Secure Checkout" : "Secure Stripe Payment"}
                </Text>
              </View>
              <Text style={styles.alertText}>
                {isRazorpay
                  ? "You will be redirected to Razorpay to complete your payment via UPI, Card, or Netbanking. Your Golden Ride account will be updated automatically."
                  : "Your payment is processed securely through Stripe. OTP / 3D-Secure authentication will be triggered if required by your bank."}
              </Text>
            </View>

            {/* Pay Now Section */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Pay Now</Text>

              {(processing || razorpayCapturing) ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.processingText}>{processingStep}</Text>
                </View>
              ) : isRazorpay ? (
                <>
                  <AppButton
                    title={`Pay ${currencySymbol}${totalFare} with Razorpay`}
                    onPress={handleRazorpayPayment}
                    disabled={processing}
                    style={styles.razorpayButton}
                  />
                  <Text style={styles.paypalSubtext}>
                    🔒 Fast & secure Indian payments
                  </Text>
                </>
              ) : (
                <AppButton
                  title={`Pay ${currencySymbol}${totalFare} via Stripe`}
                  onPress={handleStripePayment}
                  disabled={processing}
                  style={styles.payButtonActive}
                />
              )}
            </View>
          </>
        ) : (
          /* Success Receipt */
          <View style={[styles.card, styles.receiptCard]}>
            <View style={styles.receiptHeader}>
              <Ionicons name="shield-checkmark" size={36} color="#10B981" />
              <Text style={styles.receiptTitle}>Payment Successful</Text>
            </View>
            <Text style={styles.receiptBody}>
              Your {paymentMethodLabel} payment has been verified and confirmed
              successfully.
            </Text>

            <View style={styles.accountCard}>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Amount Paid</Text>
                <Text
                  style={[
                    styles.accountValue,
                    { color: "#10B981", fontWeight: "900" },
                  ]}
                >
                  {currencySymbol}
                  {totalFare}
                </Text>
              </View>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Route</Text>
                <Text style={styles.accountValue} numberOfLines={1}>
                  {trip.pickup} → {trip.dropoff}
                </Text>
              </View>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Payment Method</Text>
                <Text style={styles.accountValue}>{paymentMethodLabel}</Text>
              </View>
            </View>

            <Text style={styles.pciLabel}>
              🔒 PCI-DSS Compliant ·{" "}
              {isRazorpay ? "Razorpay Secured" : "Stripe Secured"}
            </Text>
          </View>
        )}
      </ScrollView>

      {driverPaid && (
        <View style={styles.footer}>
          <AppButton title="Finish & Close" onPress={handleDone} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  loading: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 40,
  },
  scroll: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.textPrimary,
    textAlign: "center",
    marginTop: 12,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: Colors.primary,
    textAlign: "center",
    marginVertical: 8,
  },
  tripRoute: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  stripeInfoCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  razorpayInfoCard: {
    backgroundColor: "#E8EAF6",
    borderColor: "#C5CAE9",
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#B45309",
  },
  alertText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },
  processingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  payButtonActive: {
    backgroundColor: "#6366F1",
  },
  razorpayButton: {
    backgroundColor: "#02042B",
  },
  paypalSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  receiptCard: {
    borderColor: "#10B981",
    borderWidth: 1.5,
  },
  receiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.textPrimary,
  },
  receiptBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  accountCard: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  accountValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  pciLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },
  footer: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  // WebView modal styles
  webviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#003087",
  },
  webviewClose: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  webviewTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  webviewLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  webviewLoaderText: {
    fontSize: 14,
    color: "#003087",
    fontWeight: "600",
  },
});
