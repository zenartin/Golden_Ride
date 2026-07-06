import { BASE_URL } from "../api/client";
import { useRideStore } from "../store/rideStore";
import { navigate } from "../navigation/navigationRef";
import { Alert } from "react-native";

let socket: WebSocket | null = null;
let reconnectDelay = 1000;
const maxReconnectDelay = 30000;
let heartbeatInterval: NodeJS.Timeout | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isExplicitDisconnect = false;

export function connectUserWebSocket(userId: number, token: string) {
  if (socket) return;

  isExplicitDisconnect = false;

  const host = BASE_URL.replace("/api", "").replace("http://", "ws://").replace("https://", "wss://");
  const wsUrl = `${host}/ws/user/${userId}?token=${token}`;

  console.log("Connecting user WebSocket to:", wsUrl);

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("User WebSocket connection established");
    reconnectDelay = 1000;

    // Refresh user active trip status upon connection
    useRideStore.getState().refreshActiveTrip();

    heartbeatInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log("User WebSocket event received:", msg.type, msg);

      const { setActiveTripStatus } = useRideStore.getState();

      if (msg.type === "ride_accepted") {
        setActiveTripStatus("confirmed", msg.driver);
        Alert.alert("Ride Accepted! 🚕", `Your ride request has been accepted by ${msg.driver.name}.`);
        navigate("TrackRide");
      } 
      else if (msg.type === "ride_expired") {
        setActiveTripStatus("cancelled");
        Alert.alert("Ride Expired", "No driver accepted your request within 60 seconds.");
        navigate("Home");
      } 
      else if (msg.type === "ride_cancelled") {
        setActiveTripStatus("cancelled");
        Alert.alert("Ride Cancelled", "This ride request was cancelled.");
        navigate("Home");
      }
      else if (msg.type === "ride_status_update") {
        let mappedStatus: import("../store/rideStore").RideStatus = "confirmed";
        let title = "";
        let body = "";

        if (msg.status === "arrived") {
          mappedStatus = "arriving";
          title = "Driver Arrived! 📍";
          body = "Your driver has arrived at the pickup location.";
        } else if (msg.status === "started") {
          mappedStatus = "on_trip";
          title = "Trip Started! 🚀";
          body = "You are now on your way to the drop location.";
        } else if (msg.status === "completed") {
          mappedStatus = "completed";
          title = "Trip Completed! 🏁";
          body = `You have arrived. Final fare: ₹${msg.actual_fare || ""}`;
        } else if (msg.status === "cancelled") {
          mappedStatus = "cancelled";
          title = "Trip Cancelled";
          body = "The driver or dispatcher cancelled your trip.";
        }

        setActiveTripStatus(mappedStatus);
        
        if (title) {
          Alert.alert(title, body);
        }
        
        if (mappedStatus === "completed" || mappedStatus === "cancelled") {
          navigate("Home");
        }
      }
    } catch (err) {
      console.log("Error parsing user WS message:", err);
    }
  };

  socket.onclose = (event) => {
    console.log("User WebSocket connection closed:", event.reason);
    cleanupSocket();

    if (!isExplicitDisconnect) {
      scheduleReconnect(userId, token);
    }
  };

  socket.onerror = (error) => {
    console.log("User WebSocket error:", error);
    socket?.close();
  };
}

export function disconnectUserWebSocket() {
  isExplicitDisconnect = true;
  cleanupSocket();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function cleanupSocket() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  socket = null;
}

function scheduleReconnect(userId: number, token: string) {
  if (reconnectTimer) return;

  console.log(`Reconnecting user WebSocket in ${reconnectDelay}ms`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
    connectUserWebSocket(userId, token);
  }, reconnectDelay);
}
