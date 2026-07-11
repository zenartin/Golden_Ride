import { BASE_URL } from "../api/axios";
import { useRideStore } from "../store/rideStore";
import { useAuthStore } from "../store/authStore";
import { navigate, goBack, navigationRef } from "../navigation/navigationRef";
import { Alert } from "react-native";

let socket: WebSocket | null = null;
let reconnectDelay = 1000;
const maxReconnectDelay = 30000;
let heartbeatInterval: NodeJS.Timeout | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isExplicitDisconnect = false;

export function connectDriverWebSocket(driverId: number, token: string) {
  // Only skip if socket is actively connecting or already open
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) return;
  
  isExplicitDisconnect = false;

  // Resolve ws URL from base axios URL
  // http://10.233.162.121:8000/api -> ws://10.233.162.121:8000/ws/driver/{id}
  const host = BASE_URL.replace("/api", "").replace("http://", "ws://").replace("https://", "wss://");
  const wsUrl = `${host}/ws/driver/${driverId}?token=${token}`;

  console.log("Connecting driver WebSocket to:", wsUrl);

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("Driver WebSocket connection established");
    reconnectDelay = 1000;
    
    // Fetch pending rides automatically when connected
    useRideStore.getState().fetchIncomingRequests();
    
    // Start heartbeat
    heartbeatInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  };

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log("WebSocket event received:", msg.type, msg);
      
      const { addIncomingRequest, removeIncomingRequest, setActiveRide } = useRideStore.getState();

      if (msg.type === "new_ride") {
        addIncomingRequest(msg.ride);
        // Popup modal request screen
        navigate("RideRequest", { rideId: msg.ride.id });
      } 
      else if (msg.type === "ride_accepted") {
        removeIncomingRequest(msg.ride_id);
        const currentDriverId = useAuthStore.getState().driver?.id;
        if (msg.driver_id !== currentDriverId) {
          Alert.alert("Ride Accepted", "This ride was accepted by another driver.");
          const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;
          if (currentRoute === "RideRequest") {
            goBack();
          }
        }
      } 
      else if (msg.type === "ride_expired") {
        removeIncomingRequest(msg.ride_id);
        const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;
        if (currentRoute === "RideRequest") {
          Alert.alert("Ride Expired", "The ride request has expired.");
          goBack();
        }
      } 
      else if (msg.type === "ride_cancelled") {
        removeIncomingRequest(msg.ride_id);
        
        const activeRide = useRideStore.getState().activeRide;
        if (activeRide && activeRide.id === msg.ride_id) {
          Alert.alert("Ride Cancelled", "The rider has cancelled the trip.");
          useRideStore.getState().setActiveRide(null);
          navigate("DriverDashboard");
        } else {
          Alert.alert("Ride Cancelled", "The rider has cancelled this ride request.");
          const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;
          if (currentRoute === "RideRequest") {
            goBack();
          }
        }
      }
      else if (msg.type === "ride_status_update") {
        const activeRide = useRideStore.getState().activeRide;
        if (activeRide && activeRide.id === msg.ride_id) {
          setActiveRide({ ...activeRide, status: msg.status });
        }
      }
    } catch (err) {
      console.log("Error parsing WS message:", err);
    }
  };

  socket.onclose = (event) => {
    console.log("Driver WebSocket connection closed:", event.reason);
    cleanupSocket();
    
    if (!isExplicitDisconnect) {
      scheduleReconnect(driverId, token);
    }
  };

  socket.onerror = (error) => {
    console.log("Driver WebSocket error:", error);
    socket?.close();
  };
}

export function disconnectDriverWebSocket() {
  isExplicitDisconnect = true;
  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    try {
      socket.close();
    } catch (e) {}
  }
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
  if (socket) {
    try {
      socket.close();
    } catch (err) {}
    socket = null;
  }
}

function scheduleReconnect(driverId: number, token: string) {
  if (reconnectTimer) return;

  console.log(`Reconnecting WebSocket in ${reconnectDelay}ms`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
    connectDriverWebSocket(driverId, token);
  }, reconnectDelay);
}
