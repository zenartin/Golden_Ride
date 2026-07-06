import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AppButton from "../../components/AppButton";
import AppInput from "../../components/AppInput";
import RideOptionCard from "../../components/RideOptionCard";
import { apiRequest, BASE_URL } from "../../api/client";
import { API_ENDPOINTS } from "../../api/endpoints";
import { MainStackParamList } from "../../navigation/MainNavigator";
import { RideOption } from "../../store/rideStore";
import { Colors, Spacing, Typography } from "../../theme";

type Props = NativeStackScreenProps<MainStackParamList, "ApiConsole">;

type ApiRide = {
  id: number;
  ride_class: "economy" | "comfort" | "premium";
  from_location: string;
  to_location: string;
  distance: string;
  duration: string;
  fare_amount: number;
  payment_method: string;
  status: string;
  created_at?: string;
};

export default function ApiConsoleScreen({ navigation }: Props) {
  const timestamp = Date.now().toString().slice(-6);
  const [name, setName] = useState("Golden Rider");
  const [email, setEmail] = useState(`rider${timestamp}@goldenride.com`);
  const [phone, setPhone] = useState(`9876${timestamp}`);
  const [password, setPassword] = useState("123456");
  const [otp, setOtp] = useState("1234");
  const [tokenPreview, setTokenPreview] = useState("Current app token will be used for protected APIs.");
  const [pickup, setPickup] = useState("Indiranagar");
  const [dropoff, setDropoff] = useState("MG Road, Bengaluru");
  const [rideClass, setRideClass] = useState<"economy" | "comfort" | "premium">("comfort");
  const [rideId, setRideId] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("500");
  const [options, setOptions] = useState<RideOption[]>([]);
  const [rides, setRides] = useState<ApiRide[]>([]);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState("Tap an API action to see the backend response here.");

  const selectedOption = useMemo(() => options.find((option) => option.id === rideClass), [options, rideClass]);
  const rootUrl = BASE_URL.replace(/\/api\/?$/, "");

  const runApi = async <T,>(key: string, request: () => Promise<T>, after?: (data: T) => void) => {
    setLoadingKey(key);
    try {
      const data = await request();
      after?.(data);
      setLastResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setLastResponse(message);
      Alert.alert("API error", message);
    } finally {
      setLoadingKey(null);
    }
  };

  const loadRideOptions = () =>
    runApi(
      "options",
      () =>
        apiRequest<{ options: RideOption[] }>(API_ENDPOINTS.RIDE_OPTIONS, {
          method: "POST",
          body: { pickup, dropoff },
        }),
      (data) => {
        setOptions(data.options);
        setRideClass(data.options[1]?.id ?? data.options[0]?.id ?? "comfort");
      }
    );

  const bookRide = () =>
    runApi(
      "book",
      () =>
        apiRequest<ApiRide>(API_ENDPOINTS.RIDE_BOOK, {
          method: "POST",
          body: {
            pickup,
            dropoff,
            ride_class: rideClass,
            payment_method: "Wallet",
          },
        }),
      (ride) => {
        setRideId(String(ride.id));
        setRides((current) => [ride, ...current.filter((item) => item.id !== ride.id)]);
      }
    );

  const saveTokenResponse = async (data: { access_token?: string }) => {
    if (!data.access_token) return;
    await AsyncStorage.setItem("userToken", data.access_token);
    setTokenPreview(`${data.access_token.slice(0, 28)}...`);
  };

  const apiRows = [
    { label: "POST", path: API_ENDPOINTS.REGISTER, note: "Creates a user and stores the returned bearer token." },
    { label: "POST", path: API_ENDPOINTS.LOGIN, note: "Logs in and stores the returned bearer token." },
    { label: "POST", path: API_ENDPOINTS.OTP_REQUEST, note: "Requests sandbox OTP for a phone number." },
    { label: "POST", path: API_ENDPOINTS.OTP_VERIFY, note: "Verifies OTP and stores the returned bearer token." },
    { label: "GET", path: API_ENDPOINTS.PROFILE, note: "Run from Profile or this screen." },
    { label: "GET", path: API_ENDPOINTS.WALLET, note: "Wallet screen refreshes this endpoint." },
    { label: "POST", path: API_ENDPOINTS.WALLET_TOP_UP, note: "Wallet and this screen can top up." },
    { label: "POST", path: API_ENDPOINTS.RIDE_OPTIONS, note: "Find ride choices." },
    { label: "POST", path: API_ENDPOINTS.RIDE_BOOK, note: "Book selected ride class." },
    { label: "GET", path: API_ENDPOINTS.RIDE_ACTIVE, note: "Active ride card uses this." },
    { label: "GET", path: API_ENDPOINTS.RIDE_HISTORY, note: "Trips screen uses this." },
    { label: "GET", path: API_ENDPOINTS.RIDE_DETAIL(":id"), note: "Trip detail uses this by ride ID." },
    { label: "POST", path: API_ENDPOINTS.RIDE_CANCEL(":id"), note: "Track and this screen can cancel." },
    { label: "GET", path: "/", note: "Root health check outside the /api namespace." },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>User API UI</Text>
          <Text style={styles.subtitle}>Controls for every user backend route.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Auth APIs</Text>
          <Text style={styles.meta}>These controls call the same auth APIs from Swagger and save the token for protected user APIs below.</Text>
          <AppInput label="Name" value={name} onChangeText={setName} placeholder="Full name" />
          <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="user@example.com" />
          <AppInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone" />
          <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
          <View style={styles.routeAction}>
            <RouteRow method="POST" path={API_ENDPOINTS.REGISTER} note="Register" />
            <AppButton
              title="Register"
              onPress={() =>
                runApi(
                  "register",
                  () =>
                    apiRequest<{ access_token: string }>(API_ENDPOINTS.REGISTER, {
                      method: "POST",
                      auth: false,
                      body: { name, email, phone, password },
                    }),
                  saveTokenResponse
                )
              }
              loading={loadingKey === "register"}
            />
          </View>
          <View style={styles.routeAction}>
            <RouteRow method="POST" path={API_ENDPOINTS.LOGIN} note="Login" />
            <AppButton
              title="Login"
              onPress={() =>
                runApi(
                  "login",
                  () =>
                    apiRequest<{ access_token: string }>(API_ENDPOINTS.LOGIN, {
                      method: "POST",
                      auth: false,
                      body: { email, password },
                    }),
                  saveTokenResponse
                )
              }
              loading={loadingKey === "login"}
              variant="secondary"
            />
          </View>
          <AppInput label="OTP" value={otp} onChangeText={setOtp} placeholder="1234" />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppButton
                title="OTP request"
                onPress={() =>
                  runApi(
                    "otp-request",
                    () =>
                      apiRequest<{ otp?: string }>(API_ENDPOINTS.OTP_REQUEST, {
                        method: "POST",
                        auth: false,
                        body: { phone },
                      }),
                    (data) => {
                      if (data.otp) setOtp(data.otp);
                    }
                  )
                }
                loading={loadingKey === "otp-request"}
                variant="secondary"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton
                title="OTP verify"
                onPress={() =>
                  runApi(
                    "otp-verify",
                    () =>
                      apiRequest<{ access_token: string }>(API_ENDPOINTS.OTP_VERIFY, {
                        method: "POST",
                        auth: false,
                        body: { phone, otp },
                      }),
                    saveTokenResponse
                  )
                }
                loading={loadingKey === "otp-verify"}
              />
            </View>
          </View>
          <Text style={styles.tokenText}>Authorize token: {tokenPreview}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Default API</Text>
          <RouteRow method="GET" path="/" note="Read Root" />
          <AppButton
            title="Read root"
            onPress={() =>
              runApi("root", async () => {
                const response = await fetch(rootUrl);
                const text = await response.text();
                return text ? JSON.parse(text) : null;
              })
            }
            loading={loadingKey === "root"}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile and wallet APIs</Text>
          <RouteRow method="GET" path={API_ENDPOINTS.PROFILE} note="Get Profile" />
          <RouteRow method="GET" path={API_ENDPOINTS.WALLET} note="Get Wallet" />
          <View style={styles.row}>
            <AppButton
              title="Get profile"
              onPress={() => runApi("profile", () => apiRequest(API_ENDPOINTS.PROFILE))}
              loading={loadingKey === "profile"}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Get wallet"
              onPress={() => runApi("wallet", () => apiRequest(API_ENDPOINTS.WALLET))}
              loading={loadingKey === "wallet"}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>
          <RouteRow method="POST" path={API_ENDPOINTS.WALLET_TOP_UP} note="Top Up Wallet" />
          <AppInput label="Top-up amount" value={topUpAmount} onChangeText={setTopUpAmount} placeholder="500" />
          <AppButton
            title="Top up wallet"
            onPress={() =>
              runApi("topup", () =>
                apiRequest(API_ENDPOINTS.WALLET_TOP_UP, {
                  method: "POST",
                  body: { amount: Number(topUpAmount) || 0 },
                })
              )
            }
            loading={loadingKey === "topup"}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ride option and booking APIs</Text>
          <RouteRow method="POST" path={API_ENDPOINTS.RIDE_OPTIONS} note="Get Ride Options" />
          <AppInput label="Pickup" value={pickup} onChangeText={setPickup} placeholder="Pickup location" />
          <AppInput label="Dropoff" value={dropoff} onChangeText={setDropoff} placeholder="Dropoff location" />
          <AppButton title="Get ride options" onPress={loadRideOptions} loading={loadingKey === "options"} />
          {options.length > 0 ? (
            <View style={{ gap: 10 }}>
              {options.map((option) => (
                <RideOptionCard
                  key={option.id}
                  option={option}
                  selected={option.id === rideClass}
                  onPress={() => setRideClass(option.id)}
                />
              ))}
            </View>
          ) : null}
          <AppButton
            title={selectedOption ? `Book ${selectedOption.title}` : "Book ride"}
            onPress={bookRide}
            loading={loadingKey === "book"}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ride active, history, detail, cancel APIs</Text>
          <View style={styles.row}>
            <AppButton
              title="Active"
              onPress={() =>
                runApi("active", () => apiRequest<ApiRide | null>(API_ENDPOINTS.RIDE_ACTIVE), (ride) => {
                  if (ride) setRideId(String(ride.id));
                })
              }
              loading={loadingKey === "active"}
              style={{ flex: 1 }}
            />
            <AppButton
              title="History"
              onPress={() => runApi("history", () => apiRequest<ApiRide[]>(API_ENDPOINTS.RIDE_HISTORY), setRides)}
              loading={loadingKey === "history"}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>
          <RouteRow method="GET" path={API_ENDPOINTS.RIDE_DETAIL(":ride_id")} note="Get Ride" />
          <RouteRow method="POST" path={API_ENDPOINTS.RIDE_CANCEL(":ride_id")} note="Cancel Ride" />
          <AppInput label="Ride ID" value={rideId} onChangeText={setRideId} placeholder="Ride ID from book/active/history" />
          <View style={styles.row}>
            <AppButton
              title="Get detail"
              onPress={() => runApi("detail", () => apiRequest(API_ENDPOINTS.RIDE_DETAIL(rideId)))}
              loading={loadingKey === "detail"}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Cancel"
              onPress={() => runApi("cancel", () => apiRequest(API_ENDPOINTS.RIDE_CANCEL(rideId), { method: "POST" }))}
              loading={loadingKey === "cancel"}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>
          {rides.slice(0, 4).map((ride) => (
            <Pressable key={ride.id} style={styles.rideRow} onPress={() => setRideId(String(ride.id))}>
              <Ionicons name="car-sport-outline" size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rideTitle}>#{ride.id} {ride.ride_class}</Text>
                <Text style={styles.meta}>{ride.from_location} to {ride.to_location}</Text>
              </View>
              <Text style={styles.status}>{ride.status}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>All user routes</Text>
          <View style={styles.routeList}>
            {apiRows.map((row) => (
              <RouteRow key={`${row.label}-${row.path}`} method={row.label} path={row.path} note={row.note} />
            ))}
          </View>
        </View>

        <View style={styles.responseCard}>
          <Text style={styles.sectionTitle}>Last response</Text>
          <Text style={styles.responseText}>{lastResponse}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function RouteRow({ method, path, note }: { method: string; path: string; note: string }) {
  return (
    <View style={styles.routeRow}>
      <Text style={styles.method}>{method}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.path}>{path}</Text>
        <Text style={styles.meta}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0F172A" }, // slate 900
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: "#1E293B", // slate 800
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },
  title: { color: "#F8FAFC", fontSize: Typography.subHeading, fontWeight: "900" },
  subtitle: { color: "#94A3B8", fontSize: Typography.caption, marginTop: 1 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  responseCard: {
    backgroundColor: "#020617",
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: "#1E293B",
    gap: 12,
  },
  sectionTitle: { color: "#F1F5F9", fontSize: Typography.small, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  meta: { color: "#94A3B8", fontSize: 10, lineHeight: 16 },
  row: { flexDirection: "row", gap: 10 },
  routeList: { gap: 8 },
  routeAction: { gap: 10 },
  routeRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 4 },
  method: {
    width: 54,
    overflow: "hidden",
    color: "#F59E0B",
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  path: { color: "#E2E8F0", fontSize: Typography.small, fontWeight: "700" },
  rideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  rideTitle: { color: "#F8FAFC", fontSize: Typography.small, fontWeight: "800" },
  status: { color: "#10B981", fontSize: Typography.small, fontWeight: "900" },
  tokenText: { color: "#38BDF8", fontSize: 10, lineHeight: 16, fontWeight: "700" },
  responseText: { color: "#34D399", fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", lineHeight: 18 },
});
